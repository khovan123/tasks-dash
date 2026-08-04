import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { WORKFLOW_CATEGORIES } from "@tasks-dash/contracts";
import { ProjectsService } from "../projects/projects.service";
import { WorkflowsService } from "../workflows/workflows.controller";
import { WorkItemDocument, WorkItemHydratedDocument } from "./work-item.schema";
import { CreateWorkItemDto } from "./work-items.dto";

@Injectable()
export class WorkItemsService {
  constructor(
    @InjectModel(WorkItemDocument.name) private readonly items: Model<WorkItemHydratedDocument>,
    private readonly projects: ProjectsService,
    private readonly workflows: WorkflowsService,
  ) {}
  async create(workspaceId: string, projectKey: string, reporterId: string, dto: CreateWorkItemDto) {
    const sequence = await this.projects.nextSequence(workspaceId, projectKey);
    return this.items.create({ ...dto, workspaceId, projectKey: projectKey.toUpperCase(), key: `${projectKey.toUpperCase()}-${sequence}`, sequence, reporterId, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined });
  }
  list(workspaceId: string, projectKey: string, sprintId?: string) {
    const query: Record<string, unknown> = { workspaceId, projectKey: projectKey.toUpperCase() };
    if (sprintId) query.sprintId = sprintId;
    return this.items.find(query).sort({ sequence: -1 }).exec();
  }
  async transition(workspaceId: string, key: string, statusId: string) {
    const item = await this.find(workspaceId, key);
    const workflow = await this.workflows.get(workspaceId, item.projectKey);
    const target = workflow?.statuses.find((status) => status.id === statusId);
    if (!target) throw new NotFoundException(`Workflow status ${statusId} was not found.`);
    const allowed = workflow.transitions.some((transition) => transition.fromStatusId === item.statusId && transition.toStatusId === statusId) || item.statusId === statusId;
    if (!allowed) throw new NotFoundException(`No workflow transition from ${item.statusId} to ${statusId}.`);
    item.statusId = statusId;
    if (target.category === WORKFLOW_CATEGORIES.inProgress && !item.startedAt) item.startedAt = new Date();
    if (target.category === WORKFLOW_CATEGORIES.done) item.completedAt = new Date();
    await item.save();
    return item;
  }
  async assign(workspaceId: string, key: string, assigneeId: string) {
    const item = await this.find(workspaceId, key); item.assigneeId = assigneeId; await item.save(); return item;
  }
  async addLabel(workspaceId: string, key: string, label: string) {
    const item = await this.find(workspaceId, key); if (!item.labels.includes(label)) item.labels.push(label); await item.save(); return item;
  }
  linkPullRequest(workspaceId: string, key: string, github: WorkItemDocument["github"]) {
    return this.items.findOneAndUpdate({ workspaceId, key: key.toUpperCase() }, { github }, { new: true }).exec();
  }
  private async find(workspaceId: string, key: string): Promise<WorkItemHydratedDocument> {
    const item = await this.items.findOne({ workspaceId, key: key.toUpperCase() }).exec();
    if (!item) throw new NotFoundException(`Work item ${key} was not found.`);
    return item;
  }
}
