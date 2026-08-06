import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { CreateWorkItemDto } from "./work-items.dto";
import { WorkItemsService } from "./work-items.service";

import { MemberRole } from "@tasks-dash/contracts";

export class CreateWorkItemCommand {
  constructor(public readonly workspaceId: string, public readonly projectKey: string, public readonly reporterId: string, public readonly dto: CreateWorkItemDto) {}
}
export class TransitionWorkItemCommand {
  constructor(
    public readonly workspaceId: string,
    public readonly key: string,
    public readonly statusId: string,
    public readonly actorMemberId?: string,
    public readonly actorRole?: MemberRole,
  ) {}
}
@CommandHandler(CreateWorkItemCommand)
export class CreateWorkItemHandler implements ICommandHandler<CreateWorkItemCommand> {
  constructor(private readonly service: WorkItemsService) {}
  execute(command: CreateWorkItemCommand) { return this.service.create(command.workspaceId, command.projectKey, command.reporterId, command.dto); }
}
@CommandHandler(TransitionWorkItemCommand)
export class TransitionWorkItemHandler implements ICommandHandler<TransitionWorkItemCommand> {
  constructor(private readonly service: WorkItemsService) {}
  execute(command: TransitionWorkItemCommand) {
    return this.service.transition(
      command.workspaceId,
      command.key,
      command.statusId,
      command.actorMemberId,
      command.actorRole,
    );
  }
}
