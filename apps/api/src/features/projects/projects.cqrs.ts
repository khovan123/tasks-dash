import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { MemberRole } from "@tasks-dash/contracts";
import { CreateProjectDto } from "./projects.dto";
import { ProjectsService } from "./projects.service";
export class CreateProjectCommand { constructor(public readonly workspaceId: string, public readonly actorId: string, public readonly dto: CreateProjectDto) {} }
export class ListProjectsQuery {
  constructor(
    public readonly workspaceId: string,
    public readonly memberId: string,
    public readonly role: MemberRole,
  ) {}
}
@CommandHandler(CreateProjectCommand)
export class CreateProjectHandler implements ICommandHandler<CreateProjectCommand> {
  constructor(private readonly service: ProjectsService) {}
  execute(command: CreateProjectCommand) { return this.service.create(command.workspaceId, command.actorId, command.dto); }
}
@QueryHandler(ListProjectsQuery)
export class ListProjectsHandler implements IQueryHandler<ListProjectsQuery> {
  constructor(private readonly service: ProjectsService) {}
  execute(query: ListProjectsQuery) {
    return this.service.list(query.workspaceId, query.memberId, query.role);
  }
}
