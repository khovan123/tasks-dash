import { Body, Controller, Get, Injectable, Param, Put } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import {
  DEFAULT_WORKFLOW_STATUS_IDS,
  MEMBER_ROLES,
  WORKFLOW_CATEGORIES,
} from "@tasks-dash/contracts";
import {
  RequireProjectAccess,
  RequireRoles,
  WorkspaceId,
} from "../../common/auth-context";
import { WorkflowDocument, WorkflowHydratedDocument } from "./workflows.schema";

type WorkflowStatusInput = WorkflowDocument["statuses"][number];
type WorkflowTransitionInput = WorkflowDocument["transitions"][number];

const SYSTEM_WORKFLOW_STATUSES = [
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
    name: "ToDo",
    category: WORKFLOW_CATEGORIES.toDo,
    color: "#9ca3af",
    order: 0,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
    name: "In Progress",
    category: WORKFLOW_CATEGORIES.inProgress,
    color: "#2563eb",
    order: 1,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.review,
    name: "Review",
    category: WORKFLOW_CATEGORIES.inProgress,
    color: "#7c3aed",
    order: 2,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
    name: "Request Change",
    category: WORKFLOW_CATEGORIES.inProgress,
    color: "#dc2626",
    order: 3,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.done,
    name: "Done",
    category: WORKFLOW_CATEGORIES.done,
    color: "#16a34a",
    order: 4,
  },
] as const satisfies readonly WorkflowStatusInput[];

const SYSTEM_WORKFLOW_TRANSITIONS = [
  {
    id: "SYSTEM_TO_DO_TO_IN_PROGRESS",
    name: "Auto start from GitHub activity",
    fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
    toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
    allowedRoleIds: [],
  },
  {
    id: "SYSTEM_IN_PROGRESS_TO_REVIEW",
    name: "Auto move to review requested",
    fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
    toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.review,
    allowedRoleIds: [],
  },
  {
    id: "SYSTEM_REVIEW_TO_REQUEST_CHANGE",
    name: "Auto move to request change",
    fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.review,
    toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
    allowedRoleIds: [],
  },
  {
    id: "SYSTEM_REQUEST_CHANGE_TO_IN_PROGRESS",
    name: "Auto resume on new commit",
    fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
    toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
    allowedRoleIds: [],
  },
  {
    id: "SYSTEM_IN_PROGRESS_TO_DONE",
    name: "Auto close from in progress",
    fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
    toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.done,
    allowedRoleIds: [],
  },
  {
    id: "SYSTEM_REVIEW_TO_DONE",
    name: "Auto close from review",
    fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.review,
    toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.done,
    allowedRoleIds: [],
  },
  {
    id: "SYSTEM_REQUEST_CHANGE_TO_DONE",
    name: "Auto close from request change",
    fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
    toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.done,
    allowedRoleIds: [],
  },
  {
    id: "SYSTEM_DONE_TO_IN_PROGRESS",
    name: "Auto reopen from done",
    fromStatusId: DEFAULT_WORKFLOW_STATUS_IDS.done,
    toStatusId: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
    allowedRoleIds: [],
  },
] as const satisfies readonly WorkflowTransitionInput[];

const LEGACY_STATUS_ID_ALIASES: Record<string, string> = {
  todo: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
  to_do: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
  inprogress: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
  in_progress: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
  review: DEFAULT_WORKFLOW_STATUS_IDS.review,
  requestchange: DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
  request_change: DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
  request_changes: DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
  done: DEFAULT_WORKFLOW_STATUS_IDS.done,
};

function normalizeStatusId(
  statusId?: string,
  statusName?: string,
): string | undefined {
  const idKey = statusId?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (idKey && LEGACY_STATUS_ID_ALIASES[idKey]) {
    return LEGACY_STATUS_ID_ALIASES[idKey];
  }
  const nameKey = statusName?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (nameKey && LEGACY_STATUS_ID_ALIASES[nameKey]) {
    return LEGACY_STATUS_ID_ALIASES[nameKey];
  }
  return statusId?.trim();
}

function normalizeWorkflowPayload(
  projectKey: string,
  input: Partial<WorkflowDocument> | null | undefined,
): Partial<WorkflowDocument> {
  const incomingStatuses = input?.statuses ?? [];
  const customStatuses = new Map<string, WorkflowStatusInput>();
  for (const status of incomingStatuses) {
    const normalizedId = normalizeStatusId(status.id, status.name);
    if (!normalizedId) continue;
    if (SYSTEM_WORKFLOW_STATUSES.some((item) => item.id === normalizedId)) {
      continue;
    }
    customStatuses.set(normalizedId, {
      ...status,
      id: normalizedId,
      name: status.name?.trim() || normalizedId,
      color: status.color || "#6366f1",
      order: 0,
    });
  }

  const statuses: WorkflowStatusInput[] = [
    ...SYSTEM_WORKFLOW_STATUSES,
    ...[...customStatuses.values()].map((status, index) => ({
      ...status,
      order: SYSTEM_WORKFLOW_STATUSES.length + index,
    })),
  ];

  const validStatusIds = new Set(statuses.map((status) => status.id));
  const systemPairs = new Set(
    SYSTEM_WORKFLOW_TRANSITIONS.map(
      (transition) => `${transition.fromStatusId}:${transition.toStatusId}`,
    ),
  );
  const customTransitions = new Map<string, WorkflowTransitionInput>();

  for (const transition of input?.transitions ?? []) {
    const fromStatusId = normalizeStatusId(transition.fromStatusId);
    const toStatusId = normalizeStatusId(transition.toStatusId);
    if (!fromStatusId || !toStatusId || fromStatusId === toStatusId) continue;
    if (!validStatusIds.has(fromStatusId) || !validStatusIds.has(toStatusId)) {
      continue;
    }
    const pairKey = `${fromStatusId}:${toStatusId}`;
    if (systemPairs.has(pairKey)) continue;
    customTransitions.set(pairKey, {
      ...transition,
      id: transition.id?.trim() || `${fromStatusId}_TO_${toStatusId}`,
      name: transition.name?.trim() || `Move to ${toStatusId}`,
      fromStatusId,
      toStatusId,
      allowedRoleIds: transition.allowedRoleIds ?? [],
    });
  }

  return {
    workspaceId: input?.workspaceId,
    projectKey: projectKey.toUpperCase(),
    name: input?.name?.trim() || `${projectKey.toUpperCase()} Workflow`,
    defaultStatusId: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
    statuses,
    transitions: [...SYSTEM_WORKFLOW_TRANSITIONS, ...customTransitions.values()],
  };
}

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectModel(WorkflowDocument.name)
    private readonly workflows: Model<WorkflowHydratedDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private async migrateLegacyStatusIds(
    workspaceId: string,
    projectKey: string,
    statuses: WorkflowStatusInput[],
  ): Promise<void> {
    const migrations = statuses
      .map((status) => {
        const canonicalId = normalizeStatusId(status.id, status.name);
        if (!canonicalId || canonicalId === status.id) return null;
        return this.connection.collection("work_items").updateMany(
          {
            workspaceId,
            projectKey: projectKey.toUpperCase(),
            statusId: status.id,
          },
          { $set: { statusId: canonicalId } },
        );
      })
      .filter(Boolean);
    await Promise.all(migrations);
  }

  async get(workspaceId: string, projectKey: string) {
    const existing = await this.workflows
      .findOne({ workspaceId, projectKey: projectKey.toUpperCase() })
      .exec();
    if (!existing) return null;

    const normalized = normalizeWorkflowPayload(projectKey, existing.toObject());
    await this.migrateLegacyStatusIds(workspaceId, projectKey, existing.statuses);

    const currentSnapshot = JSON.stringify({
      name: existing.name,
      defaultStatusId: existing.defaultStatusId,
      statuses: existing.statuses,
      transitions: existing.transitions,
    });
    const normalizedSnapshot = JSON.stringify({
      name: normalized.name,
      defaultStatusId: normalized.defaultStatusId,
      statuses: normalized.statuses,
      transitions: normalized.transitions,
    });
    if (currentSnapshot === normalizedSnapshot) {
      return existing;
    }

    return this.workflows
      .findOneAndUpdate(
        { workspaceId, projectKey: projectKey.toUpperCase() },
        normalized,
        { new: true },
      )
      .exec();
  }

  async upsert(
    workspaceId: string,
    projectKey: string,
    input: Partial<WorkflowDocument>,
  ) {
    await this.migrateLegacyStatusIds(workspaceId, projectKey, input.statuses ?? []);
    const normalized = normalizeWorkflowPayload(projectKey, {
      ...input,
      workspaceId,
      projectKey: projectKey.toUpperCase(),
    });
    return this.workflows
      .findOneAndUpdate(
        { workspaceId, projectKey: projectKey.toUpperCase() },
        normalized,
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }
}

@Controller("projects/:projectKey/workflow")
@RequireProjectAccess()
export class WorkflowsController {
  constructor(private readonly service: WorkflowsService) {}

  @Get()
  get(@Param("projectKey") key: string, @WorkspaceId() workspaceId: string) {
    return this.service.get(workspaceId, key);
  }

  @Put()
  @RequireRoles(MEMBER_ROLES.owner)
  update(
    @Param("projectKey") key: string,
    @Body() body: Partial<WorkflowDocument>,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.upsert(workspaceId, key, body);
  }
}
