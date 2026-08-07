import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import { format } from "date-fns";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  AUTOMATION_TRIGGERS,
  DEFAULT_WORKFLOW_STATUS_IDS,
  GithubLinkSource,
  GithubPullRequestState,
  GithubPullRequestStatus,
  GithubReviewState,
  GITHUB_PR_STATUSES,
  WORKFLOW_CATEGORIES,
  MEMBER_ROLES,
  MemberRole,
} from "@tasks-dash/contracts";
import { ProjectsService } from "../projects/projects.service";
import { WorkflowsService } from "../workflows/workflows.controller";
import {
  GithubCommitLinkDocument,
  GithubLinkDocument,
  GithubPullRequestLinkDocument,
  WorkItemDocument,
  WorkItemHydratedDocument,
} from "./work-item.schema";
import {
  CreateWorkItemDto,
  ReorderWorkItemsDto,
  UpdateWorkItemDto,
} from "./work-items.dto";
import { DiscordAdapter } from "../integrations/discord.adapter";
import {
  TaskDiscordLogDocument,
  TaskDiscordLogHydratedDocument,
} from "../integrations/integration.schemas";

export interface GithubCommitLinkInput {
  sha: string;
  message: string;
  url?: string;
  branch?: string;
  committedAt?: Date;
  sources: GithubLinkSource[];
}

export interface GithubPullRequestLinkInput {
  number: number;
  title: string;
  url: string;
  state: GithubPullRequestState;
  status?: GithubPullRequestStatus;
  draft: boolean;
  headBranch: string;
  baseBranch: string;
  headSha: string;
  action: string;
  reviewState?: GithubReviewState;
  authorLogin?: string;
  updatedAt?: Date;
  closedAt?: Date;
  mergedAt?: Date;
  sources: GithubLinkSource[];
}

function uniqueValues<T extends string>(values: T[]): T[] {
  return [...new Set(values.filter(Boolean))];
}

import { Subject } from "rxjs";
import {
  PROJECT_REALTIME_EVENT_TYPES,
  ProjectRealtimeService,
} from "../projects/project-realtime.service";

@Injectable()
export class WorkItemsService {
  readonly events$ = new Subject<{ type: string; workspaceId: string; projectKey: string; data: any }>();

  constructor(
    @InjectModel(WorkItemDocument.name)
    private readonly items: Model<WorkItemHydratedDocument>,
    private readonly projects: ProjectsService,
    private readonly realtime: ProjectRealtimeService,
    private readonly workflows: WorkflowsService,
    private readonly events: EventEmitter2,
    @Inject(forwardRef(() => DiscordAdapter))
    private readonly discord: DiscordAdapter,
    @InjectModel(TaskDiscordLogDocument.name)
    private readonly taskLogs: Model<TaskDiscordLogHydratedDocument>,
    @InjectConnection()
    private readonly connection: Connection,
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
      ],
      transitions: [
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
      ],
    });
  }

  private async transitionInternal(
    workspaceId: string,
    item: WorkItemHydratedDocument,
    statusId: string,
    options?: {
      actorMemberId?: string;
      actorRole?: MemberRole;
      bypassTransitionRules?: boolean;
    },
  ): Promise<WorkItemHydratedDocument> {
    if (options?.actorRole === MEMBER_ROLES.dev) {
      if (item.assigneeId !== options?.actorMemberId) {
        throw new ForbiddenException(
          "Dev can only transition tasks assigned to themselves.",
        );
      }
    }
    const workflow = await this.workflows.get(workspaceId, item.projectKey);
    if (!workflow) {
      throw new NotFoundException(
        `Workflow for project ${item.projectKey} was not found.`,
      );
    }
    const target = workflow.statuses.find((status) => status.id === statusId);
    if (!target) {
      throw new NotFoundException(`Workflow status ${statusId} was not found.`);
    }
    if (item.statusId === statusId) return item;

    if (
      !options?.bypassTransitionRules &&
      workflow.transitions &&
      workflow.transitions.length > 0
    ) {
      const allowed = workflow.transitions.some(
        (tr) => tr.fromStatusId === item.statusId && tr.toStatusId === statusId,
      );
      if (!allowed) {
        throw new BadRequestException(
          `Không thể chuyển trạng thái từ "${item.statusId}" sang "${statusId}" do quy tắc Workflow.`,
        );
      }
    }

    item.statusId = statusId;
    if (target.category === WORKFLOW_CATEGORIES.inProgress && !item.startedAt) {
      item.startedAt = new Date();
    }
    if (target.category === WORKFLOW_CATEGORIES.done) {
      item.completedAt = new Date();
    } else {
      item.completedAt = undefined;
    }
    await item.save();

    void this.events.emitAsync("automation.work-item-transitioned", {
      sourceEventId: `work-item-transitioned:${item.key}:${statusId}`,
      workspaceId,
      projectKey: item.projectKey,
      trigger: AUTOMATION_TRIGGERS.workItemTransitioned,
      workItemKey: item.key,
      title: item.summary,
    });

    try {
      const log = await this.taskLogs.findOne({ workItemKey: item.key }).exec();
      if (log) {
        await this.discord.sendThreadReply(
          log.discordChannelId,
          log.discordMessageId,
          {
            title: `Task Transitioned: ${item.key}`,
            description: `Status changed to **${target.name}**`,
            color: 0x8957e5,
          },
        );
      }
    } catch (e) {
      console.error("Failed to log task transition to Discord:", e);
    }

    this.events$.next({ type: "updated", workspaceId, projectKey: item.projectKey, data: item });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.workItemsChanged,
      workspaceId,
      projectKey: item.projectKey,
      data: { workItemKey: item.key, action: "updated" },
    });
    return item;
  }

  async create(
    workspaceId: string,
    projectKey: string,
    reporterId: string,
    actorRole: MemberRole,
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
    const assigneeId =
      actorRole === MEMBER_ROLES.dev ? reporterId : dto.assigneeId;
    const item = await this.items.create({
      ...dto,
      workspaceId,
      projectKey: key,
      key: `${key}-${sequence}`,
      sequence,
      rank,
      statusId,
      assigneeId: assigneeId || undefined,
      reporterId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      startedAt: dto.startDate ? new Date(dto.startDate) : undefined,
      figmaLinks: (dto.figmaLinks || []).map((link) => ({
        label: (link.label || "").trim(),
        url: (link.url || "").trim(),
      })),
      documentLinks: (dto.documentLinks || []).map((link) => ({
        label: (link.label || "").trim(),
        url: (link.url || "").trim(),
      })),
    });

    void this.events.emitAsync("automation.work-item-created", {
      sourceEventId: `work-item-created:${item.key}`,
      workspaceId,
      projectKey: key,
      trigger: AUTOMATION_TRIGGERS.workItemCreated,
      workItemKey: item.key,
      title: item.summary,
    });

    // Log to Discord #tasks channel
    try {
      const integration = await this.discord.getProjectIntegration(
        workspaceId,
        key,
      );
      if (integration?.channelId) {
        let assigneeName = "Unassigned";
        let assigneeGithub = "";
        let assigneeMention = "";

        if (item.assigneeId) {
          const assignee = await this.connection.collection("members").findOne({
            _id: new Types.ObjectId(item.assigneeId),
            workspaceId,
          });
          if (assignee) {
            assigneeName = assignee.name;
            if (assignee.githubLogin) {
              assigneeGithub = assignee.githubLogin;
            } else if (assignee.authIdentityId) {
              const identity = await this.connection.collection("auth_identities").findOne({
                _id: typeof assignee.authIdentityId === "string" ? new Types.ObjectId(assignee.authIdentityId) : assignee.authIdentityId,
              });
              if (identity?.login) {
                assigneeGithub = identity.login;
              }
            }
            if (assignee.discordUsername) {
              const discordUserId = await this.discord.findGuildMemberId(
                integration.guildId || "",
                assignee.discordUsername,
              );
              if (discordUserId) {
                assigneeMention = `<@${discordUserId}>`;
              } else {
                assigneeMention = `@${assignee.discordUsername}`;
              }
            }
          }
        }

        let durationStr = "N/A";
        if (item.startedAt && item.dueDate) {
          const diffTime = Math.abs(
            item.dueDate.getTime() - item.startedAt.getTime(),
          );
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          durationStr = `${diffDays} ngày`;
        }

        const descriptionParts = [
          `**Summary:** ${item.summary}`,
          `**Type:** ${item.type}`,
          `**Priority:** ${item.priority}`,
          `**Start Date:** ${item.startedAt ? format(item.startedAt, "dd/MM/yyyy") : "N/A"}`,
          `**Due Date:** ${item.dueDate ? format(item.dueDate, "dd/MM/yyyy") : "N/A"}`,
          `**Duration:** ${durationStr}`,
          assigneeGithub ? `**GitHub Username:** ${assigneeGithub}` : "",
          assigneeMention ? `**Assignee:** ${assigneeMention}` : "",
        ].filter(Boolean);

        const pingContent = assigneeMention.startsWith("<@") ? assigneeMention : null;

        const msgId = await this.discord.sendToChannel(
          integration.channelId,
          {
            title: `Task Created: ${item.key}`,
            description: descriptionParts.join("\n"),
            color: 0x238636,
          },
          pingContent,
        );

        await this.taskLogs.create({
          workspaceId,
          workItemKey: item.key,
          discordMessageId: msgId,
          discordChannelId: integration.channelId,
        });
      }
    } catch (e) {
      console.error("Failed to log task creation to Discord:", e);
    }

    this.events$.next({ type: "created", workspaceId, projectKey: key, data: item });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.workItemsChanged,
      workspaceId,
      projectKey: key,
      data: { workItemKey: item.key, action: "created" },
    });
    return item;
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
    this.events$.next({ type: "reordered", workspaceId, projectKey: key, data: normalizedKeys });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.workItemsChanged,
      workspaceId,
      projectKey: key,
      data: { action: "reordered" },
    });
    return { updated: result.modifiedCount };
  }

  async transition(
    workspaceId: string,
    key: string,
    statusId: string,
    actorMemberId?: string,
    actorRole?: MemberRole,
  ) {
    const item = await this.find(workspaceId, key);
    return this.transitionInternal(workspaceId, item, statusId, {
      actorMemberId,
      actorRole,
    });
  }

  async transitionBySystemRule(
    workspaceId: string,
    key: string,
    statusId: string,
  ): Promise<WorkItemHydratedDocument | null> {
    const item = await this.findOptional(workspaceId, key);
    if (!item) return null;
    return this.transitionInternal(workspaceId, item, statusId, {
      bypassTransitionRules: true,
    });
  }

  async assign(workspaceId: string, key: string, assigneeId: string | null) {
    const item = await this.find(workspaceId, key);
    item.assigneeId = assigneeId ?? undefined;
    await item.save();
    this.events$.next({ type: "updated", workspaceId, projectKey: item.projectKey, data: item });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.workItemsChanged,
      workspaceId,
      projectKey: item.projectKey,
      data: { workItemKey: item.key, action: "updated" },
    });
    return item;
  }

  async addLabel(workspaceId: string, key: string, label: string) {
    const item = await this.find(workspaceId, key);
    if (!item.labels.includes(label)) item.labels.push(label);
    await item.save();
    return item;
  }

  async linkGithubCommits(
    workspaceId: string,
    key: string,
    branch: string,
    commits: GithubCommitLinkInput[],
  ): Promise<WorkItemHydratedDocument | null> {
    const item = await this.findOptional(workspaceId, key);
    if (!item) return null;
    const github = this.githubSnapshot(item);
    github.branches = uniqueValues([
      ...github.branches,
      ...(branch ? [branch] : []),
    ]);

    for (const commit of commits) {
      const index = github.commits.findIndex(
        (entry) => entry.sha === commit.sha,
      );
      const existing = index >= 0 ? github.commits[index] : undefined;
      const next: GithubCommitLinkDocument = {
        sha: commit.sha,
        message: commit.message || existing?.message || "",
        url: commit.url ?? existing?.url,
        branch: commit.branch ?? existing?.branch ?? branch,
        committedAt: commit.committedAt ?? existing?.committedAt,
        sources: uniqueValues([
          ...(existing?.sources ?? []),
          ...commit.sources,
        ]),
      };
      if (index >= 0) github.commits[index] = next;
      else github.commits.push(next);
    }

    github.commits = github.commits
      .sort(
        (left, right) =>
          (right.committedAt?.getTime?.() ?? 0) -
          (left.committedAt?.getTime?.() ?? 0),
      )
      .slice(0, 100);
    github.branch = branch || github.branch;
    github.commitShas = uniqueValues([
      ...(github.commitShas ?? []),
      ...commits.map((commit) => commit.sha),
    ]).slice(-100);
    item.set("github", github);
    await item.save();
    this.events$.next({ type: "updated", workspaceId, projectKey: item.projectKey, data: item });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.workItemsChanged,
      workspaceId,
      projectKey: item.projectKey,
      data: { workItemKey: item.key, action: "updated" },
    });
    return item;
  }

  async upsertGithubPullRequest(
    workspaceId: string,
    key: string,
    input: GithubPullRequestLinkInput,
  ): Promise<WorkItemHydratedDocument | null> {
    const item = await this.findOptional(workspaceId, key);
    if (!item) return null;
    const github = this.githubSnapshot(item);
    const index = github.pullRequests.findIndex(
      (pullRequest) => pullRequest.number === input.number,
    );
    const existing = index >= 0 ? github.pullRequests[index] : undefined;
    const defaultStatus =
      input.state === "MERGED"
        ? GITHUB_PR_STATUSES.merged
        : input.state === "CLOSED"
          ? GITHUB_PR_STATUSES.closed
          : input.draft
            ? GITHUB_PR_STATUSES.draft
            : GITHUB_PR_STATUSES.open;
    const stateChanged = existing && existing.state !== input.state;
    const next: GithubPullRequestLinkDocument = {
      number: input.number,
      title: input.title || existing?.title || `Pull request #${input.number}`,
      url: input.url || existing?.url || "",
      state: input.state,
      status: stateChanged
        ? defaultStatus
        : (input.status ?? existing?.status ?? defaultStatus),
      draft: input.draft,
      headBranch: input.headBranch || existing?.headBranch || "",
      baseBranch: input.baseBranch || existing?.baseBranch || "",
      headSha: input.headSha || existing?.headSha || "",
      action: input.action || existing?.action || "",
      reviewState: input.reviewState ?? existing?.reviewState,
      authorLogin: input.authorLogin ?? existing?.authorLogin,
      updatedAt: input.updatedAt ?? existing?.updatedAt,
      closedAt: input.closedAt ?? existing?.closedAt,
      mergedAt: input.mergedAt ?? existing?.mergedAt,
      sources: uniqueValues([...(existing?.sources ?? []), ...input.sources]),
    };
    if (index >= 0) github.pullRequests[index] = next;
    else github.pullRequests.push(next);
    github.pullRequests = github.pullRequests
      .sort((left, right) => right.number - left.number)
      .slice(0, 20);
    github.branches = uniqueValues([
      ...github.branches,
      ...(input.headBranch ? [input.headBranch] : []),
    ]);
    github.branch = input.headBranch || github.branch;
    github.pullRequestNumber = input.number;
    github.pullRequestUrl = input.url;
    github.pullRequestState = input.state;
    item.set("github", github);
    await item.save();
    this.events$.next({ type: "updated", workspaceId, projectKey: item.projectKey, data: item });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.workItemsChanged,
      workspaceId,
      projectKey: item.projectKey,
      data: { workItemKey: item.key, action: "updated" },
    });
    return item;
  }

  private githubSnapshot(item: WorkItemHydratedDocument): GithubLinkDocument {
    const current = item.github;
    const commits = (current?.commits ?? []).map(
      (commit): GithubCommitLinkDocument => ({
        sha: commit.sha,
        message: commit.message,
        url: commit.url,
        branch: commit.branch,
        committedAt: commit.committedAt,
        sources: [...(commit.sources ?? [])],
      }),
    );
    const pullRequests = (current?.pullRequests ?? []).map(
      (pullRequest): GithubPullRequestLinkDocument => ({
        number: pullRequest.number,
        title: pullRequest.title,
        url: pullRequest.url,
        state: pullRequest.state,
        status: pullRequest.status,
        draft: pullRequest.draft,
        headBranch: pullRequest.headBranch,
        baseBranch: pullRequest.baseBranch,
        headSha: pullRequest.headSha,
        action: pullRequest.action,
        reviewState: pullRequest.reviewState,
        authorLogin: pullRequest.authorLogin,
        updatedAt: pullRequest.updatedAt,
        closedAt: pullRequest.closedAt,
        mergedAt: pullRequest.mergedAt,
        sources: [...(pullRequest.sources ?? [])],
      }),
    );

    if (
      current?.pullRequestNumber &&
      !pullRequests.some(
        (pullRequest) => pullRequest.number === current.pullRequestNumber,
      )
    ) {
      pullRequests.push({
        number: current.pullRequestNumber,
        title: `Pull request #${current.pullRequestNumber}`,
        url: current.pullRequestUrl ?? "",
        state: current.pullRequestState ?? "OPEN",
        status:
          current.pullRequestState === "MERGED"
            ? GITHUB_PR_STATUSES.merged
            : current.pullRequestState === "CLOSED"
              ? GITHUB_PR_STATUSES.closed
              : GITHUB_PR_STATUSES.open,
        draft: false,
        headBranch: current.branch ?? "",
        baseBranch: "",
        headSha: "",
        action: "legacy",
        sources: [],
      });
    }

    return {
      branches: uniqueValues([
        ...(current?.branches ?? []),
        ...(current?.branch ? [current.branch] : []),
      ]),
      commits,
      pullRequests,
      branch: current?.branch,
      commitShas: [...(current?.commitShas ?? [])],
      pullRequestNumber: current?.pullRequestNumber,
      pullRequestUrl: current?.pullRequestUrl,
      pullRequestState: current?.pullRequestState,
    };
  }

  async update(
    workspaceId: string,
    key: string,
    dto: UpdateWorkItemDto,
    actorMemberId?: string,
    actorRole?: MemberRole,
  ) {
    const item = await this.find(workspaceId, key);
    if (actorRole === MEMBER_ROLES.dev) {
      if (item.assigneeId !== actorMemberId) {
        throw new ForbiddenException(
          "Dev can only edit tasks assigned to themselves.",
        );
      }
    }
    if (dto.type !== undefined) item.type = dto.type;
    if (dto.summary !== undefined) item.summary = dto.summary;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.priority !== undefined) item.priority = dto.priority;
    if (dto.labels !== undefined) item.labels = dto.labels;
    if (dto.storyPoints !== undefined)
      item.storyPoints = dto.storyPoints ?? undefined;
    if (dto.dueDate !== undefined)
      item.dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;
    if (dto.startDate !== undefined)
      item.startedAt = dto.startDate ? new Date(dto.startDate) : undefined;
    await item.save();

    // Log update to Discord #tasks channel as reply
    try {
      const log = await this.taskLogs.findOne({ workItemKey: item.key }).exec();
      if (log) {
        const description = [
          `**Summary:** ${item.summary}`,
          `**Type:** ${item.type}`,
          `**Priority:** ${item.priority}`,
          item.description ? `**Description:** ${item.description}` : "",
        ]
          .filter(Boolean)
          .join("\n");
        await this.discord.sendThreadReply(
          log.discordChannelId,
          log.discordMessageId,
          {
            title: `Task Updated: ${item.key}`,
            description,
            color: 0x0969da,
          },
        );
      }
    } catch (e) {
      console.error("Failed to log task update to Discord:", e);
    }

    this.events$.next({ type: "updated", workspaceId, projectKey: item.projectKey, data: item });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.workItemsChanged,
      workspaceId,
      projectKey: item.projectKey,
      data: { workItemKey: item.key, action: "updated" },
    });
    return item;
  }

  private findOptional(
    workspaceId: string,
    key: string,
  ): Promise<WorkItemHydratedDocument | null> {
    return this.items.findOne({ workspaceId, key: key.toUpperCase() }).exec();
  }

  private async find(
    workspaceId: string,
    key: string,
  ): Promise<WorkItemHydratedDocument> {
    const item = await this.findOptional(workspaceId, key);
    if (!item) throw new NotFoundException(`Work item ${key} was not found.`);
    return item;
  }
}
