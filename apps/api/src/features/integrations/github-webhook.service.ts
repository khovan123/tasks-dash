import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { createHmac, timingSafeEqual } from "node:crypto";
import { AUTOMATION_TRIGGERS, GITHUB_INSTALLATION_ACTIONS, GITHUB_PR_STATES, GITHUB_PULL_REQUEST_ACTIONS, GITHUB_WEBHOOK_EVENTS } from "@tasks-dash/contracts";
import { ProjectsService } from "../projects/projects.service";
import { WorkItemsService } from "../work-items/work-items.service";
import { GithubAppService } from "./github-app.service";
import { GithubWebhookDeliveryDocument, GithubWebhookDeliveryHydratedDocument } from "./integration.schemas";

export const AUTOMATION_GITHUB_PULL_REQUEST_EVENT = "automation.github.pull-request";
const GITHUB_SUSPENSION_ACTIONS = new Set<string>([
  GITHUB_INSTALLATION_ACTIONS.suspend,
  GITHUB_INSTALLATION_ACTIONS.unsuspend,
  GITHUB_INSTALLATION_ACTIONS.deleted,
]);
interface PullRequestPayload {
  action?: string; installation?: { id?: number }; repository?: { full_name?: string };
  pull_request?: { number?: number; title?: string; body?: string; html_url?: string; state?: string; merged?: boolean; head?: { ref?: string; sha?: string } };
}
@Injectable()
export class GithubWebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly github: GithubAppService,
    private readonly projects: ProjectsService,
    private readonly workItems: WorkItemsService,
    private readonly events: EventEmitter2,
    @InjectModel(GithubWebhookDeliveryDocument.name) private readonly deliveries: Model<GithubWebhookDeliveryHydratedDocument>,
  ) {}
  verify(rawBody: Buffer | undefined, signature: string | undefined): void {
    if (!rawBody) throw new UnauthorizedException("Raw webhook body is required.");
    const expected = Buffer.from(`sha256=${createHmac("sha256", this.config.getOrThrow<string>("GITHUB_APP_WEBHOOK_SECRET")).update(rawBody).digest("hex")}`);
    const actual = Buffer.from(signature ?? "");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new UnauthorizedException("Invalid GitHub webhook signature.");
  }
  async handle(deliveryId: string, event: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const delivery = await this.deliveries.findOneAndUpdate(
      { deliveryId },
      { $setOnInsert: { deliveryId, event, receivedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
    if (delivery.processedAt) return { accepted: true, duplicate: true };

    const stale = new Date(Date.now() - 5 * 60 * 1000);
    const claimed = await this.deliveries.findOneAndUpdate(
      { _id: delivery._id, processedAt: { $exists: false }, $or: [{ processingAt: { $exists: false } }, { processingAt: { $lt: stale } }] },
      { $set: { processingAt: new Date() }, $unset: { failedAt: 1, lastError: 1 } },
      { new: true },
    ).exec();
    if (!claimed) return { accepted: true, duplicate: true, processing: true };

    try {
      const result = await this.processEvent(deliveryId, event, payload);
      await this.deliveries.updateOne({ _id: claimed._id }, { $set: { processedAt: new Date() }, $unset: { processingAt: 1, failedAt: 1, lastError: 1 } }).exec();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown webhook error";
      await this.deliveries.updateOne({ _id: claimed._id }, { $set: { failedAt: new Date(), lastError: message }, $unset: { processingAt: 1 } }).exec();
      throw error;
    }
  }

  private async processEvent(deliveryId: string, event: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (event === GITHUB_WEBHOOK_EVENTS.installation) {
      const installation = payload.installation as { id?: number } | undefined;
      const action = String(payload.action ?? "");
      if (installation?.id && GITHUB_SUSPENSION_ACTIONS.has(action)) {
        await this.github.setSuspended(installation.id, action !== GITHUB_INSTALLATION_ACTIONS.unsuspend);
      }
      return { accepted: true };
    }
    if (event === GITHUB_WEBHOOK_EVENTS.installationRepositories) {
      const installation = payload.installation as { id?: number } | undefined;
      if (installation?.id) await this.github.syncInstallation(installation.id);
      return { accepted: true };
    }
    if (event !== GITHUB_WEBHOOK_EVENTS.pullRequest) return { accepted: true, ignored: true };

    const body = payload as PullRequestPayload;
    const installationId = body.installation?.id;
    if (!installationId) throw new UnauthorizedException("GitHub webhook is missing installation.id.");
    const installation = await this.github.findByInstallationId(installationId);
    if (!installation) throw new UnauthorizedException("GitHub App installation is not connected to a workspace.");
    const repository = body.repository?.full_name;
    if (!repository) throw new UnauthorizedException("GitHub webhook is missing repository.full_name.");
    const project = (await this.projects.list(installation.workspaceId)).find((item) => item.repositoryFullName?.toLowerCase() === repository.toLowerCase());
    if (!project) return { accepted: true, linked: false, reason: "PROJECT_NOT_MAPPED" };

    const pr = body.pull_request;
    const key = [pr?.title, pr?.body, pr?.head?.ref].filter(Boolean).join(" ").match(/\b[A-Z][A-Z0-9]{1,9}-\d+\b/)?.[0];
    const state = pr?.merged ? GITHUB_PR_STATES.merged : pr?.state === "open" ? GITHUB_PR_STATES.open : GITHUB_PR_STATES.closed;
    const linked = key ? await this.workItems.linkPullRequest(installation.workspaceId, key, {
      branch: pr?.head?.ref,
      commitShas: pr?.head?.sha ? [pr.head.sha] : [],
      pullRequestNumber: pr?.number,
      pullRequestUrl: pr?.html_url,
      pullRequestState: state,
    }) : null;
    const trigger = pr?.merged
      ? AUTOMATION_TRIGGERS.pullRequestMerged
      : body.action === GITHUB_PULL_REQUEST_ACTIONS.opened || body.action === GITHUB_PULL_REQUEST_ACTIONS.reopened
        ? AUTOMATION_TRIGGERS.pullRequestOpened
        : null;
    if (trigger) {
      await this.events.emitAsync(AUTOMATION_GITHUB_PULL_REQUEST_EVENT, {
        sourceEventId: `github:${deliveryId}`,
        workspaceId: installation.workspaceId,
        projectKey: project.key,
        trigger,
        workItemKey: key ?? null,
        repositoryFullName: repository,
        pullRequestNumber: pr?.number ?? null,
        pullRequestUrl: pr?.html_url ?? null,
        title: pr?.title ?? "Pull request",
        action: body.action ?? "unknown",
      });
    }
    return { accepted: true, linked: Boolean(linked), workItemKey: key ?? null };
  }
}
