import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  AUTOMATION_TRIGGERS,
  DEFAULT_WORKFLOW_STATUS_IDS,
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
import {
  WorkItemDocument,
  WorkItemHydratedDocument,
} from "../work-items/work-item.schema";
import { DiscordAdapter } from "./discord.adapter";
import { GithubAppService } from "./github-app.service";
import {
  GithubPullRequestLogDocument,
  GithubPullRequestLogHydratedDocument,
  GithubWebhookDeliveryDocument,
  GithubWebhookDeliveryHydratedDocument,
  GithubWorkflowLogDocument,
  GithubWorkflowLogHydratedDocument,
} from "./integration.schemas";
import {
  MemberDocument,
  MemberHydratedDocument,
} from "../members/member.schema";

export const AUTOMATION_GITHUB_PULL_REQUEST_EVENT =
  "automation.github.pull-request";

// Colors
const COLOR_PR_OPEN = 0x238636;
const COLOR_PR_MERGED = 0x8957e5;
const COLOR_PR_CLOSED = 0xda3633;
const COLOR_REVIEW_APPROVED = 0x238636;
const COLOR_REVIEW_CHANGES = 0xe3b341;
const COLOR_REVIEW_COMMENT = 0x5865f2;
const COLOR_DEPLOY_SUCCESS = 0x238636;
const COLOR_DEPLOY_FAILED = 0xda3633;
const COLOR_PUSH = 0x5865f2;

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
    id?: number | string;
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
  if (
    pullRequest.draft ||
    action === GITHUB_PULL_REQUEST_ACTIONS.convertedToDraft
  ) {
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

function reviewDetails(
  reviewState: string,
  action: string,
): {
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
  private readonly logger = new Logger(GithubWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly github: GithubAppService,
    private readonly projects: ProjectsService,
    private readonly workItems: WorkItemsService,
    private readonly events: EventEmitter2,
    private readonly discord: DiscordAdapter,
    @InjectModel(GithubWebhookDeliveryDocument.name)
    private readonly deliveries: Model<GithubWebhookDeliveryHydratedDocument>,
    @InjectModel(GithubPullRequestLogDocument.name)
    private readonly prLogs: Model<GithubPullRequestLogHydratedDocument>,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberHydratedDocument>,
    @InjectModel(WorkItemDocument.name)
    private readonly workItemsModel: Model<WorkItemHydratedDocument>,
    @InjectModel(GithubWorkflowLogDocument.name)
    private readonly workflowLogs: Model<GithubWorkflowLogHydratedDocument>,
    @InjectConnection()
    private readonly connection: Connection,
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
    console.log(
      `[GithubWebhook] event=${event} action=${String(payload.action ?? "(none)")} delivery=${deliveryId}`,
    );
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
      return this.processPullRequest(deliveryId, payload as PullRequestPayload);
    }
    if (event === GITHUB_WEBHOOK_EVENTS.pullRequestReview) {
      return this.processPullRequestReview(payload as PullRequestReviewPayload);
    }
    if (event === "pull_request_review_comment" || event === "issue_comment") {
      return this.processComment(event, payload);
    }
    if (event === GITHUB_WEBHOOK_EVENTS.push) {
      return this.processPush(payload as PushPayload);
    }
    if (event === "workflow_run") {
      return this.processWorkflowRun(payload);
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

    let autoStatusId: string | null = null;
    if (pullRequest.merged || action === GITHUB_PULL_REQUEST_ACTIONS.closed) {
      autoStatusId = DEFAULT_WORKFLOW_STATUS_IDS.done;
    } else if (
      action === GITHUB_PULL_REQUEST_ACTIONS.reviewRequested ||
      action === GITHUB_PULL_REQUEST_ACTIONS.readyForReview
    ) {
      autoStatusId = DEFAULT_WORKFLOW_STATUS_IDS.review;
    } else if (
      action === GITHUB_PULL_REQUEST_ACTIONS.opened ||
      action === GITHUB_PULL_REQUEST_ACTIONS.reopened
    ) {
      autoStatusId = DEFAULT_WORKFLOW_STATUS_IDS.inProgress;
    }
    if (autoStatusId) {
      for (const workItemKey of linkedKeys) {
        await this.workItems.transitionBySystemRule(
          context.workspaceId,
          workItemKey,
          autoStatusId,
        );
      }
    }

    const trigger = pullRequest.merged
      ? AUTOMATION_TRIGGERS.pullRequestMerged
      : action === GITHUB_PULL_REQUEST_ACTIONS.opened ||
          action === GITHUB_PULL_REQUEST_ACTIONS.reopened
        ? AUTOMATION_TRIGGERS.pullRequestOpened
        : action === GITHUB_PULL_REQUEST_ACTIONS.closed
          ? AUTOMATION_TRIGGERS.pullRequestClosed
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

    // Discord #updates logging
    try {
      const prChannelId = await this.discord.getOrCreatePrChannel(
        context.workspaceId,
        context.projectKey,
      );
      if (prChannelId) {
        const existingLog = await this.prLogs
          .findOne({
            repositoryFullName: context.repositoryFullName,
            pullRequestNumber: pullRequest.number,
          })
          .exec();
        console.log(
          `[GithubWebhook] PR #${pullRequest.number} action=${action} existingLog=${existingLog ? existingLog._id : "null"}`,
        );
        const author = pullRequest.user?.login ?? "unknown";
        const mention = await this.resolveDiscordMention(
          context.workspaceId,
          context.projectKey,
          author,
        );
        // mention is either "<@discordId>" (real ping) or "@discordUsername" (text-only) or null
        const mentionDisplay = mention?.startsWith("<@")
          ? mention
          : (mention ?? null);
        const prTitle = `[PR #${pullRequest.number}] ${pullRequest.title ?? "Pull request"}`;
        const description = [
          `:bust_in_silhouette: **GitHub:** @${author}`,
          `:seedling: \`${pullRequest.head?.ref ?? "?"}\` → \`${pullRequest.base?.ref ?? "?"}\``,
          `:pushpin: **Action:** \`${pullRequest.merged ? "merged" : action}\``,
          mentionDisplay ? `:bell: **Assignee:** ${mentionDisplay}` : null,
        ].filter(Boolean).join("\n");
        // Real ping only when mention is a Discord ID (<@...>)
        const pingContent = mention?.startsWith("<@") ? mention : null;
        const color = pullRequest.merged
          ? COLOR_PR_MERGED
          : action === GITHUB_PULL_REQUEST_ACTIONS.closed
            ? COLOR_PR_CLOSED
            : COLOR_PR_OPEN;

        if (!existingLog) {
          if (
            action === GITHUB_PULL_REQUEST_ACTIONS.opened ||
            action === GITHUB_PULL_REQUEST_ACTIONS.reopened
          ) {
            const msgId = await this.discord.sendToChannel(
              prChannelId,
              { title: prTitle, description, color, url: pullRequest.html_url },
              pingContent,
            );
            await this.prLogs.create({
              workspaceId: context.workspaceId,
              repositoryFullName: context.repositoryFullName,
              pullRequestNumber: pullRequest.number,
              discordMessageId: msgId,
              discordChannelId: prChannelId,
            });
          }
          // action=edited with no log: skip — no message to update
        } else {
          if (
            action === GITHUB_PULL_REQUEST_ACTIONS.closed ||
            action === GITHUB_PULL_REQUEST_ACTIONS.reopened
          ) {
            const statusText = pullRequest.merged
              ? "Merged"
              : action === GITHUB_PULL_REQUEST_ACTIONS.closed
                ? "Closed"
                : "Reopened";
            const replyTitle = `PR #${pullRequest.number} is now ${statusText}`;
            await this.discord.sendThreadReply(
              existingLog.discordChannelId,
              existingLog.discordMessageId,
              {
                title: replyTitle,
                description,
                color,
                url: pullRequest.html_url,
              },
              pingContent,
            );
          }
          if (action === GITHUB_PULL_REQUEST_ACTIONS.edited) {
            await this.discord.editMessage(
              existingLog.discordChannelId,
              existingLog.discordMessageId,
              { title: prTitle, description, color, url: pullRequest.html_url },
            );
          }
        }
      }
    } catch (e) {
      console.error("Failed to log PR to Discord:", e);
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
          authorLogin: pullRequest.user?.login ?? body.review?.user?.login,
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

    if (details.reviewState === GITHUB_REVIEW_STATES.changesRequested) {
      for (const workItemKey of linkedKeys) {
        await this.workItems.transitionBySystemRule(
          context.workspaceId,
          workItemKey,
          DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
        );
      }
    }

    const reviewState = details.reviewState;
    const trigger =
      reviewState === GITHUB_REVIEW_STATES.approved
        ? AUTOMATION_TRIGGERS.pullRequestApproved
        : AUTOMATION_TRIGGERS.pullRequestReviewCommented;

    const targets = linkedKeys.length ? linkedKeys : ["PR"];
    for (const workItemKey of targets) {
      await this.events.emitAsync(AUTOMATION_GITHUB_PULL_REQUEST_EVENT, {
        sourceEventId: `github:review:${body.review?.id ?? randomUUID()}:${workItemKey}`,
        workspaceId: context.workspaceId,
        projectKey: context.projectKey,
        trigger,
        workItemKey: workItemKey === "PR" ? undefined : workItemKey,
        repositoryFullName: context.repositoryFullName,
        pullRequestNumber: pullRequest.number,
        pullRequestUrl: pullRequest.html_url,
        title: pullRequest.title ?? "Pull request review",
        action,
        authorLogin: body.review?.user?.login ?? pullRequest.user?.login,
      });
    }

    // Post PR review status to Discord #td-pr channel
    try {
      const existingLog = await this.prLogs
        .findOne({
          repositoryFullName: context.repositoryFullName,
          pullRequestNumber: pullRequest.number,
        })
        .exec();

      if (existingLog) {
        const reviewer = body.review?.user?.login ?? "unknown";
        const author = pullRequest.user?.login ?? "unknown";

        const [reviewerMention, authorMention] = await Promise.all([
          this.resolveDiscordMention(context.workspaceId, context.projectKey, reviewer),
          this.resolveDiscordMention(context.workspaceId, context.projectKey, author),
        ]);

        const reviewerDisplay = reviewerMention ?? `@${reviewer}`;
        const authorDisplay = authorMention ?? `@${author}`;

        const stateText =
          details.reviewState === GITHUB_REVIEW_STATES.approved
            ? "Approved"
            : details.reviewState === GITHUB_REVIEW_STATES.changesRequested
              ? "Requested Changes"
              : "Commented";

        const actionText =
          details.reviewState === GITHUB_REVIEW_STATES.approved
            ? "approved"
            : details.reviewState === GITHUB_REVIEW_STATES.changesRequested
              ? "requested changes"
              : "commented";

        const reviewAny = body.review as any;
        const commentText = reviewAny?.body ? `\n>>> ${reviewAny.body}` : "";
        const title = `PR Review: ${stateText}`;
        const description = `**@${reviewer}** submitted a review on PR #${pullRequest.number}.${commentText}`;
        
        const color =
          details.reviewState === GITHUB_REVIEW_STATES.approved
            ? COLOR_PR_OPEN // Xanh
            : details.reviewState === GITHUB_REVIEW_STATES.changesRequested
              ? COLOR_PR_CLOSED // Đỏ
              : 0x8957e5; // Tím

        const pingContent = `${reviewerDisplay} đã ${actionText} trên PR của ${authorDisplay}`;

        await this.discord.sendThreadReply(
          existingLog.discordChannelId,
          existingLog.discordMessageId,
          {
            title,
            description,
            url: reviewAny?.html_url || pullRequest.html_url,
            color,
          },
          pingContent,
        );
      }
    } catch (err) {
      this.logger.error("Failed to post PR review to Discord:", err);
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
    for (const workItemKey of linkedKeys) {
      await this.workItems.transitionBySystemRule(
        context.workspaceId,
        workItemKey,
        DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
      );
    }

    return {
      accepted: true,
      linked: linkedKeys.length > 0,
      workItemKeys: linkedKeys,
      branch,
      commitCount: commits.length,
    };
  }

  private async processWorkflowRun(
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const context = await this.resolveProject(payload as RepositoryPayload);
    if (!context) {
      return { accepted: true, linked: false, reason: "PROJECT_NOT_MAPPED" };
    }
    const run = payload.workflow_run as
      | {
          id?: number;
          name?: string;
          conclusion?: string;
          status?: string;
          html_url?: string;
          head_branch?: string;
          run_number?: number;
          actor?: { login?: string; avatar_url?: string };
        }
          if (!run) {
      return { accepted: true, ignored: true, reason: "NO_WORKFLOW_RUN" };
    }

    try {
      const integration = await this.discord.getProjectIntegration(
        context.workspaceId,
        context.projectKey,
      );
      if (!integration?.deploymentChannelId)
        return { accepted: true, ignored: true };

      const isCompleted = run.status === "completed";
      const success = run.conclusion === "success";

      // 1. Look up PR and PR Author details
      const prs = (payload as any).workflow_run?.pull_requests || [];
      let prAuthor: string | undefined = undefined;
      let prNumber: number | undefined = undefined;

      for (const pr of prs) {
        if (pr.user?.login) {
          prAuthor = pr.user.login;
          prNumber = pr.number;
          break;
        }
      }

      if (!prAuthor && run.head_branch) {
        const workItem = await this.workItemsModel
          .findOne({
            workspaceId: context.workspaceId,
            projectKey: context.projectKey,
            "github.branches": run.head_branch,
          })
          .exec();
        if (workItem?.github?.pullRequestNumber) {
          prNumber = workItem.github.pullRequestNumber;
          const prLink = workItem.github.pullRequests.find((p) => p.number === prNumber);
          prAuthor = prLink?.authorLogin;
        }
      }

      // 2. Resolve Discord mention for the PR author
      let prAuthorMention: string | null = null;
      if (prAuthor) {
        prAuthorMention = await this.resolveDiscordMention(
          context.workspaceId,
          context.projectKey,
          prAuthor,
        );
      }
      const prAuthorDisplay = prAuthorMention ?? (prAuthor ? `@${prAuthor}` : "unknown");
      
      const statusIcon = isCompleted
        ? (success ? ":white_check_mark:" : ":x:")
        : ":yellow_circle:";

      const title = `${statusIcon} [CI/CD] ${run.name ?? "Workflow"} #${run.run_number ?? "?"}`;
      const actor = run.actor?.login ?? "unknown";
      const description = [
        `:finish_flag: **Workflow:** \`${run.name ?? "Workflow"}\` #${run.run_number ?? "?"}`,
        `:bust_in_silhouette: **GitHub Actor:** @${actor}`,
        prNumber ? `:memo: **PR:** #${prNumber} (Author: ${prAuthorDisplay})` : "",
        `:seedling: **Branch:** \`${run.head_branch ?? "?"}\``,
        `:bar_chart: **Status:** \`${run.conclusion ?? run.status}\``,
        run.html_url ? `:link: **[View CI/CD Run](${run.html_url})**` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const color = isCompleted
        ? (success ? COLOR_DEPLOY_SUCCESS : COLOR_DEPLOY_FAILED)
        : 0xf59e0b; // Yellow/Orange for pending/in_progress

      const embed = {
        title,
        description,
        color,
        url: run.html_url,
      };

      const existingLog = await this.workflowLogs
        .findOne({ workflowRunId: run.id })
        .exec();

      if (existingLog) {
        try {
          await this.discord.editMessage(
            existingLog.discordChannelId,
            existingLog.discordMessageId,
            embed,
            prAuthorMention,
          );
        } catch (err) {
          this.logger.warn(`Could not edit existing workflow run log message, sending a new one: ${String(err)}`);
          const msgId = await this.discord.sendToChannel(
            integration.deploymentChannelId,
            embed,
            prAuthorMention,
          );
          await this.workflowLogs.updateOne(
            { _id: existingLog._id },
            { $set: { discordMessageId: msgId, discordChannelId: integration.deploymentChannelId } },
          ).exec();
        }
      } else {
        const msgId = await this.discord.sendToChannel(
          integration.deploymentChannelId,
          embed,
          prAuthorMention,
        );
        await this.workflowLogs.create({
          workspaceId: context.workspaceId,
          projectKey: context.projectKey,
          workflowRunId: run.id,
          discordMessageId: msgId,
          discordChannelId: integration.deploymentChannelId,
        });
      }

      if (isCompleted) {
        const trigger = success
          ? AUTOMATION_TRIGGERS.ciCdDeploymentSuccess
          : AUTOMATION_TRIGGERS.ciCdDeploymentFailed;

        await this.events.emitAsync(AUTOMATION_GITHUB_PULL_REQUEST_EVENT, {
          sourceEventId: `github:workflow:${run.id ?? randomUUID()}`,
          workspaceId: context.workspaceId,
          projectKey: context.projectKey,
          trigger,
          repositoryFullName: context.repositoryFullName,
          title: `${run.name ?? "Workflow"} #${run.run_number ?? "?"} (${run.conclusion ?? run.status})`,
          action: run.conclusion ?? "completed",
          authorLogin: run.actor?.login,
        });

        // Post CI/CD build status on PR in td-pr channel
        const prs = (payload as any).workflow_run?.pull_requests || [];
        const prLogCandidates: any[] = [];
        for (const pr of prs) {
          if (pr.number) {
            const prLog = await this.prLogs
              .findOne({
                repositoryFullName: context.repositoryFullName,
                pullRequestNumber: pr.number,
              })
              .exec();
            if (prLog) prLogCandidates.push(prLog);
          }
        }
        if (prLogCandidates.length === 0 && run.head_branch) {
          const workItem = await this.workItemsModel
            .findOne({
              workspaceId: context.workspaceId,
              projectKey: context.projectKey,
              "github.branches": run.head_branch,
            })
            .exec();
          if (workItem?.github?.pullRequestNumber) {
            const prLog = await this.prLogs
              .findOne({
                repositoryFullName: context.repositoryFullName,
                pullRequestNumber: workItem.github.pullRequestNumber,
              })
              .exec();
            if (prLog) prLogCandidates.push(prLog);
          }
        }

        for (const prLog of prLogCandidates) {
          await this.discord.sendThreadReply(
            prLog.discordChannelId,
            prLog.discordMessageId,
            {
              title: `[CI/CD] Build Status`,
              description: `${statusIcon} Workflow **${run.name ?? "Workflow"}** #${run.run_number ?? "?"} conclusion: **${run.conclusion ?? run.status}**\n${run.html_url ? `[View Workflow Run](${run.html_url})` : ""}`,
              color: success ? COLOR_DEPLOY_SUCCESS : COLOR_DEPLOY_FAILED,
            },
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to process workflow run on Discord: ${String(err)}`,
      );
    }

    return { accepted: true };
  }

  private async resolveDiscordMention(
    workspaceId: string,
    projectKey: string,
    githubLogin: string,
  ): Promise<string | null> {
    try {
      let member = await this.members
        .findOne({
          workspaceId,
          githubLogin: { $regex: new RegExp(`^${githubLogin}$`, "i") },
        })
        .exec();

      if (!member) {
        const identity = await this.connection
          .collection("auth_identities")
          .findOne({
            login: { $regex: new RegExp(`^${githubLogin}$`, "i") },
          });
        if (identity) {
          member = await this.members
            .findOne({
              workspaceId,
              authIdentityId: String(identity._id),
            })
            .exec();
        }
      }

      if (member?.discordUsername) {
        const integration = await this.discord.getProjectIntegration(
          workspaceId,
          projectKey,
        );
        if (integration?.guildId) {
          const discordId = await this.discord.findGuildMemberId(
            integration.guildId,
            member.discordUsername,
          );
          if (discordId) {
            return `<@${discordId}>`;
          }
        }
        return `@${member.discordUsername}`;
      }
    } catch (e) {
      console.error("Error resolving discord mention:", e);
    }
    return null;
  }

  private async processComment(
    event: string,
    payload: any,
  ): Promise<Record<string, unknown>> {
    const context = await this.resolveProject(payload);
    if (!context) {
      return { accepted: true, linked: false, reason: "PROJECT_NOT_MAPPED" };
    }

    const isPrComment =
      event === "pull_request_review_comment" ||
      (event === "issue_comment" && payload.issue?.pull_request);
    if (!isPrComment) {
      return { accepted: true, ignored: true, reason: "NOT_A_PR_COMMENT" };
    }

    const prNumber =
      event === "pull_request_review_comment"
        ? payload.pull_request?.number
        : payload.issue?.number;

    const prUrl =
      event === "pull_request_review_comment"
        ? payload.pull_request?.html_url
        : payload.issue?.html_url;

    if (!prNumber) {
      return { accepted: true, ignored: true, reason: "MISSING_PR_NUMBER" };
    }

    const commentBody = payload.comment?.body;
    const author = payload.comment?.user?.login ?? "unknown";

    if (!commentBody) {
      return { accepted: true, ignored: true, reason: "EMPTY_COMMENT" };
    }

    try {
      const existingLog = await this.prLogs
        .findOne({
          repositoryFullName: context.repositoryFullName,
          pullRequestNumber: prNumber,
        })
        .exec();

      if (existingLog) {
        const mention = await this.resolveDiscordMention(
          context.workspaceId,
          context.projectKey,
          author,
        );
        const description = [
          `**@${author}** commented:`,
          `>>> ${commentBody}`,
        ].join("\n");
        const pingContent = mention?.startsWith("<@") ? mention : null;

        await this.discord.sendThreadReply(
          existingLog.discordChannelId,
          existingLog.discordMessageId,
          {
            title: `New Comment on PR #${prNumber}`,
            description,
            url: payload.comment.html_url || prUrl,
            color: COLOR_PR_OPEN,
          },
          pingContent,
        );
      } else {
        const prChannelId = await this.discord.getOrCreatePrChannel(
          context.workspaceId,
          context.projectKey,
        );
        if (prChannelId) {
          const mention = await this.resolveDiscordMention(
            context.workspaceId,
            context.projectKey,
            author,
          );
          const description = [
            `**@${author}** commented on PR #${prNumber}:`,
            `>>> ${commentBody}`,
          ].join("\n");
          const pingContent = mention?.startsWith("<@") ? mention : null;

          const msgId = await this.discord.sendToChannel(
            prChannelId,
            {
              title: `New Comment on PR #${prNumber}`,
              description,
              url: payload.comment.html_url || prUrl,
              color: COLOR_PR_OPEN,
            },
            pingContent,
          );

          await this.prLogs.create({
            workspaceId: context.workspaceId,
            repositoryFullName: context.repositoryFullName,
            pullRequestNumber: prNumber,
            discordMessageId: msgId,
            discordChannelId: prChannelId,
          });
        }
      }
    } catch (e) {
      console.error("Failed to process PR comment Discord notification:", e);
    }

    return { accepted: true, prNumber };
  }
}
