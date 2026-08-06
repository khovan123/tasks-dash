import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import {
  AuthSession,
  CurrentMemberRole,
  CurrentSession,
  RequireProjectAccess,
  RequireRoles,
  RequireWorkItemAccess,
  WorkspaceId,
} from "../../common/auth-context";
import { MEMBER_ROLES, MemberRole } from "@tasks-dash/contracts";
import {
  CreateWorkItemCommand,
  TransitionWorkItemCommand,
} from "./work-items.cqrs";
import {
  CreateWorkItemDto,
  ReorderWorkItemsDto,
  TransitionWorkItemDto,
  UpdateWorkItemDto,
} from "./work-items.dto";
import { WorkItemsService } from "./work-items.service";

@Controller()
export class WorkItemsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly service: WorkItemsService,
  ) {}

  @Get("projects/:projectKey/work-items")
  @RequireProjectAccess()
  list(
    @Param("projectKey") key: string,
    @Query("sprintId") sprintId: string | undefined,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.list(workspaceId, key, sprintId);
  }

  @Post("projects/:projectKey/work-items")
  @RequireProjectAccess()
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.dev,
  )
  create(
    @Param("projectKey") key: string,
    @Body() dto: CreateWorkItemDto,
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
  ) {
    return this.commands.execute(
      new CreateWorkItemCommand(workspaceId, key, session.userId, dto),
    );
  }

  @Patch("projects/:projectKey/work-items/reorder")
  @RequireProjectAccess()
  @RequireRoles(
    MEMBER_ROLES.owner,
  )
  reorder(
    @Param("projectKey") key: string,
    @Body() dto: ReorderWorkItemsDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.reorder(workspaceId, key, dto);
  }

  @Patch("work-items/:key/status")
  @RequireWorkItemAccess()
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.dev,
  )
  transition(
    @Param("key") key: string,
    @Body() dto: TransitionWorkItemDto,
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @CurrentMemberRole() role: MemberRole,
  ) {
    return this.commands.execute(
      new TransitionWorkItemCommand(workspaceId, key, dto.statusId, session.memberId, role),
    );
  }

  @Patch("work-items/:key")
  @RequireWorkItemAccess()
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.dev,
  )
  update(
    @Param("key") key: string,
    @Body() dto: UpdateWorkItemDto,
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @CurrentMemberRole() role: MemberRole,
  ) {
    return this.service.update(workspaceId, key, dto, session.memberId, role);
  }
}
