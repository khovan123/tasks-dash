import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  DEFAULT_WORKFLOW_STATUS_IDS,
  WORKFLOW_CATEGORIES,
} from "@tasks-dash/contracts";
import { ProjectsService } from "../projects/projects.service";
import { WorkflowsService } from "../workflows/workflows.controller";
import {
  WorkItemDocument,
  WorkItemHydratedDocument,
} from "./work-item.schema";
import {
  CreateWorkItemDto,
  ReorderWorkItemsDto,
} from "./work-items.dto";

@Injectable()
export class WorkItemsService {
  constructor(
    @InjectModel(WorkItemDocument.name)
    private readonly items: Model<WorkItemHydratedDocument>,
    private readonly projects: ProjectsService,
    private readonly workflows: WorkflowsService,
  ) {}

  private async ensureWorkflow(workspaceId: string, projectKey: string) {
    const existing = await this.workflows.get(workspaceId, projectKey);
    if (existing) return existing;
    return this.workflows.upsert(workspaceId, projectKey, {
      name: "Default workflow",
      defaultStatusId: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
      statuses: [
        {
          id: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
          name: "To do",
          category: WORKFLOW_CATEGORIES.toDo,
          color: "#64748b",
          order: 0,
        },
        {
          id: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
          name: "In progress",
          category: WORKFLOW_CATEGORIES.inProgress,
          color: "#2563eb",
          order: 1,
        },
        {
          id: DEFAULT_WORKFLOW_STATUS_IDS.done,
          name: "Done",
          category: WORKFLOW_CATEGORIES.done,
          color: "#16a34a",
          order: 2,
        },
      ],
      transitions: [
        {
          id: "TO_DO_TO_IN_PROGRESS",
          name: "Start work",
          fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
          toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
          allowedRoleIds: [],
        },
        {
          id: "IN_PROGRESS_TO_DONE",
          name: "Complete",
          fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
          toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.done,
          allowedRoleIds: [],
        },
        {
          id: "IN_PROGRESS_TO_TO_DO",
          name: "Return to backlog",
          fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
          toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
          allowedRoleIds: [],
        },
        {
          id: "DONE_TO_IN_PROGRESS",
          name: "Reopen",
          fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.done,
          toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
          allowedRoleIds: [],
        },
      ],
    });
  }

  async create(
    workspaceId: string,
    projectKey: string,
    reporterId: string,
    dto: CreateWorkItemDto,
  ) {
    const key = projectKey.toUpperCase();
    await this.projects.getByKey(workspaceId, key);
    const workflow = await this.ensureWorkflow(workspaceId, key);
    const statusId = dto.statusId ?? workflow.defaultStatusId;
    if (!workflow.statuses.some((status) => status.id === statusId)) {
      throw new BadRequestException(`Workflow status ${statusId} is invalid.`);
    }
    const [sequence, lastItem] = await Promise.all([
      this.projects.nextSequence(workspaceId, key),
      this.items
        .findOne({ workspaceId, projectKey: key })
        .sort({ rank: -1, sequence: -1 })
        .select({ rank: 1 })
        .lean()
        .exec(),
    ]);
    const rank = (lastItem?.rank ?? 0) + 1000;
    return this.items.create({
      ...dto,
      workspaceId,
      projectKey: key,
      key: `${key}-${sequence}`,
      sequence,
      rank,
      statusId,
      reporterId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      figmaLinks: dto.figmaLinks.map((link) => ({
        label: link.label.trim(),
        url: link.url.trim(),
      })),
      documentLinks: dto.documentLinks.map((link) => ({
        label: link.label.trim(),
        url: link.url.trim(),
      })),
    });
  }

  list(workspaceId: string, projectKey: string, sprintId?: string) {
    const query: Record<string, unknown> = {
      workspaceId,
      projectKey: projectKey.toUpperCase(),
    };
    if (sprintId) query.sprintId = sprintId;
    return this.items.find(query).sort({ rank: 1, sequence: 1 }).exec();
  }

  async reorder(
    workspaceId: string,
    projectKey: string,
    dto: ReorderWorkItemsDto,
  ): Promise<{ updated: number }> {
    const key = projectKey.toUpperCase();
    const normalizedKeys = dto.orderedKeys.map((item) => item.toUpperCase());
    const items = await this.items
      .find({ workspaceId, projectKey: key, key: { $in: normalizedKeys } })
      .select({ key: 1 })
      .lean()
      .exec();
    if (items.length !== normalizedKeys.length) {
      throw new BadRequestException(
        "All reordered work items must belong to the same project.",
      );
    }
    if (normalizedKeys.length === 0) return { updated: 0 };
    const result = await this.items.bulkWrite(
      normalizedKeys.map((workItemKey, index) => ({
        updateOne: {
          filter: { workspaceId, projectKey: key, key: workItemKey },
          update: { $set: { rank: (index + 1) * 1000 } },
        },
      })),
    );
    return { updated: result.modifiedCount };
  }

  async transition(workspaceId: string, key: string, statusId: string) {
    const item = await this.find(workspaceId, key);
    const workflow = await this.workflows.get(workspaceId, item.projectKey);
    const target = workflow?.statuses.find((status) => status.id === statusId);
    if (!target) {
      throw new NotFoundException(`Workflow status ${statusId} was not found.`);
    }
    const allowed =
      workflow.transitions.some(
        (transition) =>
          transition.fromStatusId === item.statusId &&
          transition.toStatusId === statusId,
      ) || item.statusId === statusId;
    if (!allowed) {
      throw new NotFoundException(
        `No workflow transition from ${item.statusId} to ${statusId}.`,
      );
    }
    item.statusId = statusId;
    if (
      target.category === WORKFLOW_CATEGORIES.inProgress &&
      !item.startedAt
    ) {
      item.startedAt = new Date();
    }
    if (target.category === WORKFLOW_CATEGORIES.done) {
      item.completedAt = new Date();
    } else {
      item.completedAt = undefined;
    }
    await item.save();
    return item;
  }

  async assign(workspaceId: string, key: string, assigneeId: string) {
    const item = await this.find(workspaceId, key);
    item.assigneeId = assigneeId;
    await item.save();
    return item;
  }

  async addLabel(workspaceId: string, key: string, label: string) {
    const item = await this.find(workspaceId, key);
    if (!item.labels.includes(label)) item.labels.push(label);
    await item.save();
    return item;
  }

  linkPullRequest(
    workspaceId: string,
    key: string,
    github: WorkItemDocument["github"],
  ) {
    return this.items
      .findOneAndUpdate(
        { workspaceId, key: key.toUpperCase() },
        { github },
        { new: true },
      )
      .exec();
  }

  private async find(
    workspaceId: string,
    key: string,
  ): Promise<WorkItemHydratedDocument> {
    const item = await this.items
      .findOne({ workspaceId, key: key.toUpperCase() })
      .exec();
    if (!item) throw new NotFoundException(`Work item ${key} was not found.`);
    return item;
  }
}
