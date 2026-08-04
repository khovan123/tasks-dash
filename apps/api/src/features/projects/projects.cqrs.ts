import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { CreateProjectDto } from "./projects.dto";
import { ProjectsService } from "./projects.service";
export class CreateProjectCommand { constructor(public readonly workspaceId: string, public readonly dto: CreateProjectDto) {} }
export class ListProjectsQuery { constructor(public readonly workspaceId: string) {} }
@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand> {
  constructor(private readonly service: ProjectsService) {}
  execute(command: CreateProjectCommand) { return this.service.create(command.workspaceId, command.dto); }
}
@QueryHandler(ListProjectsQuery)
export class ListProjectsHandler implements IQueryHandler<ListProjectsQuery> {
  constructor(private readonly service: ProjectsService) {}
  execute(query: ListProjectsQuery) { return this.service.list(query.workspaceId); }
}
