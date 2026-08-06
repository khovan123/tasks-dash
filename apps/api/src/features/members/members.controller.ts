import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  AuthSession,
  CurrentSession,
  PublicRoute,
  RequireRoles,
  WorkspaceId,
} from "../../common/auth-context";
import {
  BootstrapWorkspaceDto,
  InviteWorkspaceMemberDto,
  UpdateMemberProfileDto,
  UpdateWorkspaceMemberRoleDto,
} from "./members.dto";
import { MembersService } from "./members.service";

@Controller("workspace")
export class MembersController {
  constructor(private readonly service: MembersService) {}

  @PublicRoute()
  @Post("bootstrap")
  bootstrap(
    @Headers("x-workspace-bootstrap-secret") secret: string | undefined,
    @Body() body: BootstrapWorkspaceDto,
  ): Promise<Record<string, unknown>> {
    return this.service.bootstrap(secret, body);
  }

  @Get("members")
  list(@WorkspaceId() workspaceId: string): Promise<Record<string, unknown>> {
    return this.service.list(workspaceId);
  }

  @Get("me")
  async getMyProfile(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
  ): Promise<Record<string, unknown>> {
    const data = await this.service.updateMyProfile(workspaceId, session.userId, {});
    return data;
  }

  @Patch("me")
  updateMyProfile(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Body() body: UpdateMemberProfileDto,
  ): Promise<Record<string, unknown>> {
    return this.service.updateMyProfile(workspaceId, session.userId, body);
  }

  @Post("invitations")
  @RequireRoles(MEMBER_ROLES.owner)
  invite(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Body() body: InviteWorkspaceMemberDto,
  ): Promise<Record<string, unknown>> {
    return this.service.invite(workspaceId, session.userId, body);
  }

  @Post("invitations/:invitationId/resend")
  @RequireRoles(MEMBER_ROLES.owner)
  resend(
    @WorkspaceId() workspaceId: string,
    @Param("invitationId") invitationId: string,
  ): Promise<Record<string, unknown>> {
    return this.service.resend(workspaceId, invitationId);
  }

  @Delete("invitations/:invitationId")
  @RequireRoles(MEMBER_ROLES.owner)
  revoke(
    @WorkspaceId() workspaceId: string,
    @Param("invitationId") invitationId: string,
  ): Promise<void> {
    return this.service.revoke(workspaceId, invitationId);
  }

  @Patch("members/:memberId/role")
  @RequireRoles(MEMBER_ROLES.owner)
  updateRole(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Param("memberId") memberId: string,
    @Body() body: UpdateWorkspaceMemberRoleDto,
  ) {
    return this.service.updateRole(
      workspaceId,
      session.userId,
      memberId,
      body.role,
    );
  }

  @Delete("members/:memberId")
  @RequireRoles(MEMBER_ROLES.owner)
  removeMember(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Param("memberId") memberId: string,
  ): Promise<void> {
    return this.service.removeMember(workspaceId, session.userId, memberId);
  }
}
