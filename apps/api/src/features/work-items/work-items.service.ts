import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  DEFAULT_WORKFLOW_STATUS_IDS,
  GithubLinkSource,
  GithubPullRequestState,
  GithubPullRequestStatus,
  GithubReviewState,
  GITHUB_PR_STATUSES,
  WORKFLOW_CATEGORIES,
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
} from "./work-items.dto";

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
    if (!workflow) {
      throw new NotFoundException(
        `Workflow for project ${item.projectKey} was not found.`,
      );
    }
    const target = workflow.statuses.find((status) => status.id === statusId);
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
      const index = github.commits.findIndex((entry) => entry.sha === commit.sha);
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
    const next: GithubPullRequestLinkDocument = {
      number: input.number,
      title: input.title || existing?.title || `Pull request #${input.number}`,
      url: input.url || existing?.url || "",
      state: input.state,
      status: input.status ?? existing?.status ?? defaultStatus,
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
      sources: uniqueValues([
        ...(existing?.sources ?? []),
        ...input.sources,
      ]),
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

  private findOptional(
    workspaceId: string,
    key: string,
  ): Promise<WorkItemHydratedDocument | null> {
    return this.items
      .findOne({ workspaceId, key: key.toUpperCase() })
      .exec();
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
