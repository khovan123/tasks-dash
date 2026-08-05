import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomBytes } from "node:crypto";
import type { Response } from "express";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  AuthSession,
  CurrentSession,
  PublicRoute,
  RequireRoles,
} from "../../common/auth-context";
import {
  CreateWorkspaceDto,
  DeleteWorkspaceDto,
  SetupFirstWorkspaceDto,
  UpdateWorkspaceDto,
} from "../members/members.dto";
import { MembersService } from "../members/members.service";
import { WorkspaceLifecycleService } from "../members/workspace-lifecycle.service";
import {
  IntegrationOauthStateDocument,
  IntegrationOauthStateHydratedDocument,
} from "../integrations/integration.schemas";
import {
  AuthIdentityDocument,
  AuthIdentityHydratedDocument,
} from "./auth.schemas";
import { SESSION_COOKIE, SessionService } from "./session.service";

const WORKSPACE_SETUP_PROVIDER = "workspace_setup";
const WORKSPACE_SETUP_CONTEXT = "pending_workspace";

@Controller("workspaces")
export class WorkspacesController {
  constructor(
    private readonly config: ConfigService,
    private readonly members: MembersService,
    private readonly lifecycle: WorkspaceLifecycleService,
    private readonly sessions: SessionService,
    @InjectModel(AuthIdentityDocument.name)
    private readonly identities: Model<AuthIdentityHydratedDocument>,
    @InjectModel(IntegrationOauthStateDocument.name)
    private readonly oauthStates: Model<IntegrationOauthStateHydratedDocument>,
  ) {}

  private setWorkspaceSession(
    response: Response,
    session: Omit<AuthSession, "issuedAt" | "expiresAt">,
  ): void {
    response.cookie(
      SESSION_COOKIE,
      this.sessions.sign(session),
      this.sessions.cookieOptions(),
    );
  }

  private async issueSetupToken(identityId: string): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.oauthStates.create({
      state: token,
      workspaceId: WORKSPACE_SETUP_CONTEXT,
      memberId: identityId,
      provider: WORKSPACE_SETUP_PROVIDER,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    return token;
  }

  @Get()
  async list(@CurrentSession() session: AuthSession) {
    const workspaces = await this.members.listMemberships(session.identityId);
    return workspaces.map((workspace) => ({
      ...workspace,
      active: workspace.workspaceId === session.workspaceId,
    }));
  }

  @PublicRoute()
  @Post("setup")
  async setupFirstWorkspace(
    @Body() body: SetupFirstWorkspaceDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const setupState = await this.oauthStates
      .findOneAndDelete({
        state: body.setupToken,
        workspaceId: WORKSPACE_SETUP_CONTEXT,
        provider: WORKSPACE_SETUP_PROVIDER,
        expiresAt: { $gt: new Date() },
      })
      .exec();
    if (!setupState?.memberId) {
      throw new UnauthorizedException(
        "Workspace setup link is invalid or has expired. Sign in with GitHub again.",
      );
    }

    const identity = await this.identities.findById(setupState.memberId).exec();
    if (!identity) {
      throw new UnauthorizedException("GitHub identity was not found.");
    }
    if (await this.members.resolveLoginMembership(String(identity._id))) {
      throw new ConflictException(
        "This GitHub account already belongs to a workspace.",
      );
    }

    const created = await this.members.createWorkspaceForOwner(
      String(identity._id),
      identity.githubId,
      identity.email,
      { name: identity.name, avatarUrl: identity.avatarUrl },
      body,
    );
    const memberId = String(created.member._id);
    identity.lastWorkspaceId = created.workspace.workspaceId;
    await identity.save();

    this.setWorkspaceSession(response, {
      identityId: String(identity._id),
      memberId,
      userId: memberId,
      githubId: identity.githubId,
      login: identity.login,
      name: identity.name,
      email: identity.email,
      avatarUrl: identity.avatarUrl,
      workspaceId: created.workspace.workspaceId,
    });

    return {
      workspaceId: created.workspace.workspaceId,
      name: created.workspace.name,
      slug: created.workspace.slug,
      role: created.member.role,
      active: true,
    };
  }

  @Post()
  async create(
    @CurrentSession() session: AuthSession,
    @Body() body: CreateWorkspaceDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const created = await this.members.createWorkspaceForOwner(
      session.identityId,
      session.githubId,
      session.email,
      { name: session.name, avatarUrl: session.avatarUrl },
      body,
    );
    const memberId = String(created.member._id);
    await this.identities
      .updateOne(
        { _id: session.identityId },
        { $set: { lastWorkspaceId: created.workspace.workspaceId } },
      )
      .exec();
    this.setWorkspaceSession(response, {
      ...session,
      memberId,
      userId: memberId,
      workspaceId: created.workspace.workspaceId,
    });
    return {
      workspaceId: created.workspace.workspaceId,
      name: created.workspace.name,
      slug: created.workspace.slug,
      role: created.member.role,
      active: true,
    };
  }

  @Patch(":workspaceId")
  async renameWorkspace(
    @Param("workspaceId") workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Body() body: UpdateWorkspaceDto,
  ) {
    const workspace = await this.lifecycle.rename(
      session.identityId,
      workspaceId,
      body.workspaceName,
    );
    return {
      workspaceId: workspace.workspaceId,
      name: workspace.name,
      slug: workspace.slug,
      active: workspace.workspaceId === session.workspaceId,
    };
  }

  @Delete(":workspaceId")
  async deleteWorkspace(
    @Param("workspaceId") workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Body() body: DeleteWorkspaceDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.lifecycle.delete(
      session.identityId,
      workspaceId,
      body.confirmWorkspaceName,
    );

    const remaining = await this.members.listMemberships(session.identityId);
    const fallback = remaining[0];
    if (fallback) {
      await this.identities
        .updateOne(
          { _id: session.identityId },
          { $set: { lastWorkspaceId: fallback.workspaceId } },
        )
        .exec();
      this.setWorkspaceSession(response, {
        ...session,
        memberId: fallback.memberId,
        userId: fallback.memberId,
        workspaceId: fallback.workspaceId,
      });
      return {
        deletedWorkspaceId: workspaceId,
        activeWorkspaceId: fallback.workspaceId,
        requiresWorkspaceSetup: false,
      };
    }

    await this.identities
      .updateOne(
        { _id: session.identityId },
        { $unset: { lastWorkspaceId: 1 } },
      )
      .exec();
    response.clearCookie(SESSION_COOKIE, this.sessions.cookieOptions());
    const setupToken = await this.issueSetupToken(session.identityId);
    const setupUrl = new URL(
      "/workspaces/new",
      this.config.getOrThrow<string>("WEB_APP_URL"),
    );
    setupUrl.searchParams.set("setup", setupToken);
    return {
      deletedWorkspaceId: workspaceId,
      activeWorkspaceId: null,
      requiresWorkspaceSetup: true,
      setupUrl: setupUrl.toString(),
    };
  }

  @Post(":workspaceId/switch")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
    MEMBER_ROLES.member,
    MEMBER_ROLES.viewer,
  )
  async switchWorkspace(
    @Param("workspaceId") workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Res({ passthrough: true }) response: Response,
  ) {
    const member = await this.members.membershipForWorkspace(
      session.identityId,
      workspaceId,
    );
    await this.members.touchLogin(member, {
      name: session.name,
      avatarUrl: session.avatarUrl,
    });
    await this.identities
      .updateOne(
        { _id: session.identityId },
        { $set: { lastWorkspaceId: workspaceId } },
      )
      .exec();
    const memberId = String(member._id);
    this.setWorkspaceSession(response, {
      ...session,
      memberId,
      userId: memberId,
      workspaceId,
    });
    return {
      workspaceId,
      memberId,
      role: member.role,
      active: true,
    };
  }
}
