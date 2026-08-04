import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { CreateProjectCommand, ListProjectsQuery } from "./projects.cqrs";
import { CreateProjectDto } from "./projects.dto";
import { ProjectsService } from "./projects.service";
@Controller("projects")
export class ProjectsController {
  constructor(private readonly commands: CommandBus, private readonly queries: QueryBus, private readonly service: ProjectsService) {}
  @Get() list(@Headers("x-workspace-id") workspaceId = "demo") { return this.queries.execute(new ListProjectsQuery(workspaceId)); }
  @Get(":key") get(@Param("key") key: string, @Headers("x-workspace-id") workspaceId = "demo") { return this.service.getByKey(workspaceId, key); }
  @Post() create(@Body() dto: CreateProjectDto, @Headers("x-workspace-id") workspaceId = "demo") { return this.commands.execute(new CreateProjectCommand(workspaceId, dto)); }
}
