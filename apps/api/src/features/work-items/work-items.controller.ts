import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { CreateWorkItemCommand, TransitionWorkItemCommand } from "./work-items.cqrs";
import { CreateWorkItemDto, TransitionWorkItemDto } from "./work-items.dto";
import { WorkItemsService } from "./work-items.service";
@Controller()
export class WorkItemsController {
  constructor(private readonly commands: CommandBus, private readonly service: WorkItemsService) {}
  @Get("projects/:projectKey/work-items") list(@Param("projectKey") key: string, @Query("sprintId") sprintId: string | undefined, @Headers("x-workspace-id") workspaceId = "demo") { return this.service.list(workspaceId, key, sprintId); }
  @Post("projects/:projectKey/work-items") create(@Param("projectKey") key: string, @Body() dto: CreateWorkItemDto, @Headers("x-workspace-id") workspaceId = "demo") { return this.commands.execute(new CreateWorkItemCommand(workspaceId, key, dto)); }
  @Patch("work-items/:key/status") transition(@Param("key") key: string, @Body() dto: TransitionWorkItemDto, @Headers("x-workspace-id") workspaceId = "demo") { return this.commands.execute(new TransitionWorkItemCommand(workspaceId, key, dto.statusId)); }
}
