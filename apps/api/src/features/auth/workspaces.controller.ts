import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { Response } from "express";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  AuthSession,
  CurrentSession,
  RequireRoles,
} from "../../common/auth-context";
import { CreateWorkspaceDto } from "../members/members.dto";
import { MembersService } from "../members/members.service";
import {
  AuthIdentityDocument,
  AuthIdentityHydratedDocument,
} from "./auth.schemas";
import { SESSION_COOKIE, SessionService } from "./session.service";

@Controller("workspaces")
export class WorkspacesController {
  constructor(
    private readonly members: MembersService,
    private readonly sessions: SessionService,
    @InjectModel(AuthIdentityDocument.name)
    private readonly identities: Model<AuthIdentityHydratedDocument>,
  ) {}

  @Get()
  async list(@CurrentSession() session: AuthSession) {
    const workspaces = await this.members.listMemberships(session.identityId);
    return workspaces.map((workspace) => ({
      ...workspace,
      active: workspace.workspaceId === session.workspaceId,
    }));
  }

  @Post()
  @RequireRoles(MEMBER_ROLES.owner)
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
    response.cookie(
      SESSION_COOKIE,
      this.sessions.sign({
        ...session,
        memberId,
        userId: memberId,
        workspaceId: created.workspace.workspaceId,
      }),
      this.sessions.cookieOptions(),
    );
    return {
      workspaceId: created.workspace.workspaceId,
      name: created.workspace.name,
      slug: created.workspace.slug,
      role: created.member.role,
      active: true,
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
    response.cookie(
      SESSION_COOKIE,
      this.sessions.sign({
        ...session,
        memberId,
        userId: memberId,
        workspaceId,
      }),
      this.sessions.cookieOptions(),
    );
    return {
      workspaceId,
      memberId,
      role: member.role,
      active: true,
    };
  }
}
