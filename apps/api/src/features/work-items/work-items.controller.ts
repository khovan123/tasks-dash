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
  CurrentSession,
  RequireRoles,
  WorkspaceId,
} from "../../common/auth-context";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  CreateWorkItemCommand,
  TransitionWorkItemCommand,
} from "./work-items.cqrs";
import {
  CreateWorkItemDto,
  ReorderWorkItemsDto,
  TransitionWorkItemDto,
} from "./work-items.dto";
import { WorkItemsService } from "./work-items.service";

@Controller()
export class WorkItemsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly service: WorkItemsService,
  ) {}

  @Get("projects/:projectKey/work-items")
  list(
    @Param("projectKey") key: string,
    @Query("sprintId") sprintId: string | undefined,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.list(workspaceId, key, sprintId);
  }

  @Post("projects/:projectKey/work-items")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
    MEMBER_ROLES.member,
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
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
    MEMBER_ROLES.member,
  )
  reorder(
    @Param("projectKey") key: string,
    @Body() dto: ReorderWorkItemsDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.reorder(workspaceId, key, dto);
  }

  @Patch("work-items/:key/status")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
    MEMBER_ROLES.member,
  )
  transition(
    @Param("key") key: string,
    @Body() dto: TransitionWorkItemDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.commands.execute(
      new TransitionWorkItemCommand(workspaceId, key, dto.statusId),
    );
  }
}
