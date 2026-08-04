import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  AUTOMATION_TRIGGERS,
  GithubLinkSource,
  GithubPullRequestStatus,
  GithubReviewState,
  GITHUB_INSTALLATION_ACTIONS,
  GITHUB_LINK_SOURCES,
  GITHUB_PR_STATES,
  GITHUB_PR_STATUSES,
  GITHUB_PULL_REQUEST_ACTIONS,
  GITHUB_REVIEW_STATES,
  GITHUB_WEBHOOK_EVENTS,
} from "@tasks-dash/contracts";
import { ProjectsService } from "../projects/projects.service";
import {
  GithubCommitLinkInput,
  GithubPullRequestLinkInput,
  WorkItemsService,
} from "../work-items/work-items.service";
import { GithubAppService } from "./github-app.service";
import {
  GithubWebhookDeliveryDocument,
  GithubWebhookDeliveryHydratedDocument,
} from "./integration.schemas";

export const AUTOMATION_GITHUB_PULL_REQUEST_EVENT =
  "automation.github.pull-request";

const GITHUB_SUSPENSION_ACTIONS = new Set<string>([
  GITHUB_INSTALLATION_ACTIONS.suspend,
  GITHUB_INSTALLATION_ACTIONS.unsuspend,
  GITHUB_INSTALLATION_ACTIONS.deleted,
]);

interface RepositoryPayload {
  installation?: { id?: number };
  repository?: { full_name?: string };
}

interface PullRequestData {
  number?: number;
  title?: string;
  body?: string;
  html_url?: string;
  state?: string;
  merged?: boolean;
  draft?: boolean;
  updated_at?: string;
  closed_at?: string;
  merged_at?: string;
  user?: { login?: string };
  head?: { ref?: string; sha?: string };
  base?: { ref?: string };
}

interface PullRequestPayload extends RepositoryPayload {
  action?: string;
  pull_request?: PullRequestData;
}

interface PullRequestReviewPayload extends RepositoryPayload {
  action?: string;
  pull_request?: PullRequestData;
  review?: {
    state?: string;
    submitted_at?: string;
    user?: { login?: string };
  };
}

interface PushCommitPayload {
  id?: string;
  message?: string;
  url?: string;
  timestamp?: string;
}

interface PushPayload extends RepositoryPayload {
  ref?: string;
  deleted?: boolean;
  commits?: PushCommitPayload[];
  head_commit?: PushCommitPayload | null;
}

interface ProjectContext {
  workspaceId: string;
  projectKey: string;
  repositoryFullName: string;
}

interface KeySourceInput {
  source: GithubLinkSource;
  value?: string | null;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractProjectKeys(
  projectKey: string,
  inputs: KeySourceInput[],
): Map<string, GithubLinkSource[]> {
  const matches = new Map<string, Set<GithubLinkSource>>();
  const pattern = new RegExp(
    `(^|[^A-Z0-9])(${escapeRegularExpression(projectKey)}-\\d+)(?![A-Z0-9])`,
    "gi",
  );

  for (const input of inputs) {
    const value = input.value ?? "";
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(value)) !== null) {
      const key = match[2]?.toUpperCase();
      if (!key) continue;
      const sources = matches.get(key) ?? new Set<GithubLinkSource>();
      sources.add(input.source);
      matches.set(key, sources);
    }
  }

  return new Map(
    [...matches.entries()].map(([key, sources]) => [key, [...sources]]),
  );
}

function pullRequestState(pullRequest: PullRequestData) {
  if (pullRequest.merged) return GITHUB_PR_STATES.merged;
  return String(pullRequest.state).toUpperCase() === GITHUB_PR_STATES.open
    ? GITHUB_PR_STATES.open
    : GITHUB_PR_STATES.closed;
}

function pullRequestStatus(
  pullRequest: PullRequestData,
  action: string,
): GithubPullRequestStatus | undefined {
  if (pullRequest.merged) return GITHUB_PR_STATUSES.merged;
  if (String(pullRequest.state).toUpperCase() === GITHUB_PR_STATES.closed) {
    return GITHUB_PR_STATUSES.closed;
  }
  if (pullRequest.draft || action === GITHUB_PULL_REQUEST_ACTIONS.convertedToDraft) {
    return GITHUB_PR_STATUSES.draft;
  }
  if (action === GITHUB_PULL_REQUEST_ACTIONS.reviewRequested) {
    return GITHUB_PR_STATUSES.reviewRequested;
  }
  if (
    action === GITHUB_PULL_REQUEST_ACTIONS.opened ||
    action === GITHUB_PULL_REQUEST_ACTIONS.reopened ||
    action === GITHUB_PULL_REQUEST_ACTIONS.synchronize ||
    action === GITHUB_PULL_REQUEST_ACTIONS.readyForReview ||
    action === GITHUB_PULL_REQUEST_ACTIONS.reviewRequestRemoved
  ) {
    return GITHUB_PR_STATUSES.open;
  }
  return undefined;
}

function reviewDetails(reviewState: string, action: string): {
  reviewState: GithubReviewState;
  status: GithubPullRequestStatus;
} {
  const normalized = reviewState.toUpperCase();
  if (normalized === GITHUB_REVIEW_STATES.approved) {
    return {
      reviewState: GITHUB_REVIEW_STATES.approved,
      status: GITHUB_PR_STATUSES.approved,
    };
  }
  if (normalized === GITHUB_REVIEW_STATES.changesRequested) {
    return {
      reviewState: GITHUB_REVIEW_STATES.changesRequested,
      status: GITHUB_PR_STATUSES.changesRequested,
    };
  }
  if (
    normalized === GITHUB_REVIEW_STATES.dismissed ||
    action.toUpperCase() === GITHUB_REVIEW_STATES.dismissed
  ) {
    return {
      reviewState: GITHUB_REVIEW_STATES.dismissed,
      status: GITHUB_PR_STATUSES.reviewRequested,
    };
  }
  return {
    reviewState: GITHUB_REVIEW_STATES.commented,
    status: GITHUB_PR_STATUSES.reviewCommented,
  };
}

@Injectable()
export class GithubWebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly github: GithubAppService,
    private readonly projects: ProjectsService,
    private readonly workItems: WorkItemsService,
    private readonly events: EventEmitter2,
    @InjectModel(GithubWebhookDeliveryDocument.name)
    private readonly deliveries: Model<GithubWebhookDeliveryHydratedDocument>,
  ) {}

  verify(rawBody: Buffer | undefined, signature: string | undefined): void {
    if (!rawBody) {
      throw new UnauthorizedException("Raw webhook body is required.");
    }
    const expected = Buffer.from(
      `sha256=${createHmac(
        "sha256",
        this.config.getOrThrow<string>("GITHUB_APP_WEBHOOK_SECRET"),
      )
        .update(rawBody)
        .digest("hex")}`,
    );
    const actual = Buffer.from(signature ?? "");
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException("Invalid GitHub webhook signature.");
    }
  }

  async handle(
    deliveryId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const delivery = await this.deliveries
      .findOneAndUpdate(
        { deliveryId },
        { $setOnInsert: { deliveryId, event, receivedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    if (delivery.processedAt) return { accepted: true, duplicate: true };

    const stale = new Date(Date.now() - 5 * 60 * 1000);
    const claimed = await this.deliveries
      .findOneAndUpdate(
        {
          _id: delivery._id,
          processedAt: { $exists: false },
          $or: [
            { processingAt: { $exists: false } },
            { processingAt: { $lt: stale } },
          ],
        },
        {
          $set: { processingAt: new Date() },
          $unset: { failedAt: 1, lastError: 1 },
        },
        { new: true },
      )
      .exec();
    if (!claimed) {
      return { accepted: true, duplicate: true, processing: true };
    }

    try {
      const result = await this.processEvent(deliveryId, event, payload);
      await this.deliveries
        .updateOne(
          { _id: claimed._id },
          {
            $set: { processedAt: new Date() },
            $unset: { processingAt: 1, failedAt: 1, lastError: 1 },
          },
        )
        .exec();
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown webhook error";
      await this.deliveries
        .updateOne(
          { _id: claimed._id },
          {
            $set: { failedAt: new Date(), lastError: message },
            $unset: { processingAt: 1 },
          },
        )
        .exec();
      throw error;
    }
  }

  private async processEvent(
    deliveryId: string,
    event: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (event === GITHUB_WEBHOOK_EVENTS.installation) {
      const installation = payload.installation as { id?: number } | undefined;
      const action = String(payload.action ?? "");
      if (installation?.id && GITHUB_SUSPENSION_ACTIONS.has(action)) {
        await this.github.setSuspended(
          installation.id,
          action !== GITHUB_INSTALLATION_ACTIONS.unsuspend,
        );
      }
      return { accepted: true };
    }

    if (event === GITHUB_WEBHOOK_EVENTS.installationRepositories) {
      const installation = payload.installation as { id?: number } | undefined;
      if (installation?.id) {
        await this.github.syncInstallation(installation.id);
      }
      return { accepted: true };
    }

    if (event === GITHUB_WEBHOOK_EVENTS.pullRequest) {
      return this.processPullRequest(
        deliveryId,
        payload as PullRequestPayload,
      );
    }
    if (event === GITHUB_WEBHOOK_EVENTS.pullRequestReview) {
      return this.processPullRequestReview(
        payload as PullRequestReviewPayload,
      );
    }
    if (event === GITHUB_WEBHOOK_EVENTS.push) {
      return this.processPush(payload as PushPayload);
    }
    return { accepted: true, ignored: true };
  }

  private async resolveProject(
    payload: RepositoryPayload,
  ): Promise<ProjectContext | null> {
    const installationId = payload.installation?.id;
    if (!installationId) {
      throw new UnauthorizedException(
        "GitHub webhook is missing installation.id.",
      );
    }
    const installation = await this.github.findByInstallationId(installationId);
    if (!installation) {
      throw new UnauthorizedException(
        "GitHub App installation is not connected to a workspace.",
      );
    }
    const repositoryFullName = payload.repository?.full_name;
    if (!repositoryFullName) {
      throw new UnauthorizedException(
        "GitHub webhook is missing repository.full_name.",
      );
    }
    const project = (await this.projects.list(installation.workspaceId)).find(
      (item) =>
        item.repositoryFullName?.toLowerCase() ===
        repositoryFullName.toLowerCase(),
    );
    if (!project) return null;
    return {
      workspaceId: installation.workspaceId,
      projectKey: project.key,
      repositoryFullName,
    };
  }

  private async processPullRequest(
    deliveryId: string,
    body: PullRequestPayload,
  ): Promise<Record<string, unknown>> {
    const context = await this.resolveProject(body);
    if (!context) {
      return { accepted: true, linked: false, reason: "PROJECT_NOT_MAPPED" };
    }
    const pullRequest = body.pull_request;
    if (!pullRequest?.number || !pullRequest.html_url) {
      throw new UnauthorizedException(
        "GitHub pull request payload is incomplete.",
      );
    }
    const action = body.action ?? "unknown";
    const keySources = extractProjectKeys(context.projectKey, [
      {
        source: GITHUB_LINK_SOURCES.pullRequestTitle,
        value: pullRequest.title,
      },
      {
        source: GITHUB_LINK_SOURCES.pullRequestBody,
        value: pullRequest.body,
      },
      {
        source: GITHUB_LINK_SOURCES.branchName,
        value: pullRequest.head?.ref,
      },
    ]);
    const state = pullRequestState(pullRequest);
    const status = pullRequestStatus(pullRequest, action);
    const linkedKeys: string[] = [];

    for (const [workItemKey, sources] of keySources) {
      const input: GithubPullRequestLinkInput = {
        number: pullRequest.number,
        title: pullRequest.title ?? `Pull request #${pullRequest.number}`,
        url: pullRequest.html_url,
        state,
        status,
        draft: Boolean(pullRequest.draft),
        headBranch: pullRequest.head?.ref ?? "",
        baseBranch: pullRequest.base?.ref ?? "",
        headSha: pullRequest.head?.sha ?? "",
        action,
        authorLogin: pullRequest.user?.login,
        updatedAt: parseDate(pullRequest.updated_at),
        closedAt: parseDate(pullRequest.closed_at),
        mergedAt: parseDate(pullRequest.merged_at),
        sources,
      };
      const linked = await this.workItems.upsertGithubPullRequest(
        context.workspaceId,
        workItemKey,
        input,
      );
      if (linked) linkedKeys.push(workItemKey);
    }

    const trigger = pullRequest.merged
      ? AUTOMATION_TRIGGERS.pullRequestMerged
      : action === GITHUB_PULL_REQUEST_ACTIONS.opened ||
          action === GITHUB_PULL_REQUEST_ACTIONS.reopened
        ? AUTOMATION_TRIGGERS.pullRequestOpened
        : null;
    if (trigger) {
      for (const workItemKey of linkedKeys) {
        await this.events.emitAsync(AUTOMATION_GITHUB_PULL_REQUEST_EVENT, {
          sourceEventId: `github:${deliveryId}:${workItemKey}`,
          workspaceId: context.workspaceId,
          projectKey: context.projectKey,
          trigger,
          workItemKey,
          repositoryFullName: context.repositoryFullName,
          pullRequestNumber: pullRequest.number,
          pullRequestUrl: pullRequest.html_url,
          title: pullRequest.title ?? "Pull request",
          action,
        });
      }
    }

    return {
      accepted: true,
      linked: linkedKeys.length > 0,
      workItemKeys: linkedKeys,
      sources: Object.fromEntries(keySources),
    };
  }

  private async processPullRequestReview(
    body: PullRequestReviewPayload,
  ): Promise<Record<string, unknown>> {
    const context = await this.resolveProject(body);
    if (!context) {
      return { accepted: true, linked: false, reason: "PROJECT_NOT_MAPPED" };
    }
    const pullRequest = body.pull_request;
    if (!pullRequest?.number || !pullRequest.html_url) {
      throw new UnauthorizedException(
        "GitHub pull request review payload is incomplete.",
      );
    }
    const action = body.action ?? "unknown";
    const details = reviewDetails(body.review?.state ?? "", action);
    const keySources = extractProjectKeys(context.projectKey, [
      {
        source: GITHUB_LINK_SOURCES.pullRequestTitle,
        value: pullRequest.title,
      },
      {
        source: GITHUB_LINK_SOURCES.pullRequestBody,
        value: pullRequest.body,
      },
      {
        source: GITHUB_LINK_SOURCES.branchName,
        value: pullRequest.head?.ref,
      },
    ]);
    const linkedKeys: string[] = [];

    for (const [workItemKey, sources] of keySources) {
      const linked = await this.workItems.upsertGithubPullRequest(
        context.workspaceId,
        workItemKey,
        {
          number: pullRequest.number,
          title: pullRequest.title ?? `Pull request #${pullRequest.number}`,
          url: pullRequest.html_url,
          state: pullRequestState(pullRequest),
          status: pullRequest.merged
            ? GITHUB_PR_STATUSES.merged
            : details.status,
          draft: Boolean(pullRequest.draft),
          headBranch: pullRequest.head?.ref ?? "",
          baseBranch: pullRequest.base?.ref ?? "",
          headSha: pullRequest.head?.sha ?? "",
          action,
          reviewState: details.reviewState,
          authorLogin:
            pullRequest.user?.login ?? body.review?.user?.login,
          updatedAt:
            parseDate(body.review?.submitted_at) ??
            parseDate(pullRequest.updated_at),
          closedAt: parseDate(pullRequest.closed_at),
          mergedAt: parseDate(pullRequest.merged_at),
          sources,
        },
      );
      if (linked) linkedKeys.push(workItemKey);
    }

    return {
      accepted: true,
      linked: linkedKeys.length > 0,
      workItemKeys: linkedKeys,
      reviewState: details.reviewState,
    };
  }

  private async processPush(
    body: PushPayload,
  ): Promise<Record<string, unknown>> {
    const context = await this.resolveProject(body);
    if (!context) {
      return { accepted: true, linked: false, reason: "PROJECT_NOT_MAPPED" };
    }
    const branch = (body.ref ?? "").replace(/^refs\/heads\//, "");
    if (body.deleted || !branch || body.ref === branch) {
      return { accepted: true, ignored: true, reason: "NOT_A_BRANCH_PUSH" };
    }

    const commitMap = new Map<string, PushCommitPayload>();
    for (const commit of body.commits ?? []) {
      if (commit.id) commitMap.set(commit.id, commit);
    }
    if (body.head_commit?.id) {
      commitMap.set(body.head_commit.id, body.head_commit);
    }
    const commits = [...commitMap.values()];
    const grouped = new Map<string, GithubCommitLinkInput[]>();
    const branchKeys = extractProjectKeys(context.projectKey, [
      { source: GITHUB_LINK_SOURCES.branchName, value: branch },
    ]);
    for (const key of branchKeys.keys()) grouped.set(key, []);

    for (const commit of commits) {
      if (!commit.id) continue;
      const keySources = extractProjectKeys(context.projectKey, [
        { source: GITHUB_LINK_SOURCES.branchName, value: branch },
        {
          source: GITHUB_LINK_SOURCES.commitMessage,
          value: commit.message,
        },
      ]);
      for (const [workItemKey, sources] of keySources) {
        const links = grouped.get(workItemKey) ?? [];
        links.push({
          sha: commit.id,
          message: commit.message ?? "",
          url: commit.url,
          branch,
          committedAt: parseDate(commit.timestamp),
          sources,
        });
        grouped.set(workItemKey, links);
      }
    }

    const linkedKeys: string[] = [];
    for (const [workItemKey, linkedCommits] of grouped) {
      const linked = await this.workItems.linkGithubCommits(
        context.workspaceId,
        workItemKey,
        branch,
        linkedCommits,
      );
      if (linked) linkedKeys.push(workItemKey);
    }

    return {
      accepted: true,
      linked: linkedKeys.length > 0,
      workItemKeys: linkedKeys,
      branch,
      commitCount: commits.length,
    };
  }
}
