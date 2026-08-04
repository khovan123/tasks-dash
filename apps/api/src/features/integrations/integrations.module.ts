import { Body, Controller, Get, Headers, Injectable, Module, Param, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { GITHUB_PR_STATES, GITHUB_WEBHOOK_EVENTS } from "@tasks-dash/contracts";
import { WorkItemsModule } from "../work-items/work-items.module";
import { WorkItemsService } from "../work-items/work-items.service";

@Injectable()
export class DiscordAdapter {
  constructor(private readonly config: ConfigService) {}
  async send(title: string, description: string): Promise<{ delivered: boolean }> {
    const url = this.config.get<string>("DISCORD_WEBHOOK_URL");
    if (!url) return { delivered: false };
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ embeds: [{ title, description, timestamp: new Date().toISOString() }] }) });
    return { delivered: response.ok };
  }
}
@Injectable()
export class GoogleDriveAdapter {
  constructor(private readonly config: ConfigService) {}
  async listTree(rootFolderId: string) {
    const demoMode = this.config.get<string>("INTEGRATION_DEMO_MODE", "true") === "true";
    if (demoMode) return { rootFolderId, source: "DEMO", items: [
      { id: "folder-product", parentId: rootFolderId, name: "01. Product", type: "FOLDER", children: [
        { id: "doc-requirements", parentId: "folder-product", name: "Product Requirements", type: "GOOGLE_DOC", modifiedTime: new Date().toISOString() },
        { id: "sheet-roadmap", parentId: "folder-product", name: "Roadmap", type: "GOOGLE_SHEET", modifiedTime: new Date().toISOString() },
      ] },
      { id: "folder-engineering", parentId: rootFolderId, name: "02. Engineering", type: "FOLDER", children: [] },
    ] };
    return { rootFolderId, source: "GOOGLE_DRIVE", items: [], message: "Provide a service-account/OAuth implementation for your deployment policy." };
  }
}
@Injectable()
export class GithubWebhookService {
  constructor(private readonly config: ConfigService, private readonly workItems: WorkItemsService, private readonly discord: DiscordAdapter) {}
  verify(rawBody: string, signature?: string): void {
    const secret = this.config.get<string>("GITHUB_WEBHOOK_SECRET");
    if (!secret) return;
    const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
    if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new UnauthorizedException("Invalid GitHub webhook signature.");
  }
  async handle(workspaceId: string, event: string, payload: Record<string, any>) {
    if (event !== GITHUB_WEBHOOK_EVENTS.pullRequest) return { accepted: true, ignored: true };
    const pr = payload.pull_request;
    const haystack = [pr?.title, pr?.body, pr?.head?.ref].filter(Boolean).join(" ");
    const key = haystack.match(/\b[A-Z][A-Z0-9]{1,9}-\d+\b/)?.[0];
    if (!key) return { accepted: true, linked: false };
    const state = pr?.merged ? GITHUB_PR_STATES.merged : pr?.state === "open" ? GITHUB_PR_STATES.open : GITHUB_PR_STATES.closed;
    const item = await this.workItems.linkPullRequest(workspaceId, key, { branch: pr?.head?.ref, commitShas: [], pullRequestNumber: pr?.number, pullRequestUrl: pr?.html_url, pullRequestState: state });
    await this.discord.send(`${key}: pull request ${payload.action}`, `${pr?.title ?? "Pull request"}\n${pr?.html_url ?? ""}`);
    return { accepted: true, linked: Boolean(item), key };
  }
}
@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly github: GithubWebhookService, private readonly drive: GoogleDriveAdapter, private readonly discord: DiscordAdapter) {}
  @Post("github/webhook") githubWebhook(@Req() request: any, @Headers("x-github-event") event = "unknown", @Headers("x-hub-signature-256") signature: string | undefined, @Headers("x-workspace-id") workspaceId = "demo", @Body() body: Record<string, any> = {}) {
    this.github.verify(JSON.stringify(body), signature);
    return this.github.handle(workspaceId, event, body);
  }
  @Get("google-drive/projects/:projectKey/tree") driveTree(@Param("projectKey") _projectKey: string, @Query("rootFolderId") rootFolderId = "demo-root") { return this.drive.listTree(rootFolderId); }
  @Post("discord/test") discordTest(@Body() body: { title?: string; description?: string }) { return this.discord.send(body.title ?? "Tasks Dash connected", body.description ?? "Discord integration test succeeded."); }
}
@Module({ imports: [WorkItemsModule], controllers: [IntegrationsController], providers: [GithubWebhookService, GoogleDriveAdapter, DiscordAdapter], exports: [GithubWebhookService, GoogleDriveAdapter, DiscordAdapter] })
export class IntegrationsModule {}
