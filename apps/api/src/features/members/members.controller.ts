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

  @Post("invitations")
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
  invite(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Body() body: InviteWorkspaceMemberDto,
  ): Promise<Record<string, unknown>> {
    return this.service.invite(workspaceId, session.userId, body);
  }

  @Post("invitations/:invitationId/resend")
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
  resend(
    @WorkspaceId() workspaceId: string,
    @Param("invitationId") invitationId: string,
  ): Promise<Record<string, unknown>> {
    return this.service.resend(workspaceId, invitationId);
  }

  @Delete("invitations/:invitationId")
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
  revoke(
    @WorkspaceId() workspaceId: string,
    @Param("invitationId") invitationId: string,
  ): Promise<void> {
    return this.service.revoke(workspaceId, invitationId);
  }

  @Patch("members/:memberId/role")
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
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
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
  removeMember(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Param("memberId") memberId: string,
  ): Promise<void> {
    return this.service.removeMember(workspaceId, session.userId, memberId);
  }
}
