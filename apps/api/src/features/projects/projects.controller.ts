import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { AuthSession, CurrentSession, RequireRoles, WorkspaceId } from "../../common/auth-context";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { CreateProjectCommand, ListProjectsQuery } from "./projects.cqrs";
import { CreateProjectDto } from "./projects.dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly commands: CommandBus, private readonly queries: QueryBus, private readonly service: ProjectsService) {}
  @Get() list(@WorkspaceId() workspaceId: string) { return this.queries.execute(new ListProjectsQuery(workspaceId)); }
  @Get(":key") get(@Param("key") key: string, @WorkspaceId() workspaceId: string) { return this.service.getByKey(workspaceId, key); }
  @Post()
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
  create(@Body() dto: CreateProjectDto, @WorkspaceId() workspaceId: string, @CurrentSession() session: AuthSession) {
    return this.commands.execute(new CreateProjectCommand(workspaceId, session.userId, dto));
  }
}
