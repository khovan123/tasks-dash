import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import { ProjectsService } from "../projects/projects.service";
import { ConnectDiscordDto, DiscordIntegrationDocument, DiscordIntegrationHydratedDocument } from "./integration.schemas";

interface DiscordWebhookMetadata { id: string; name: string | null; channel_id: string }
@Injectable()
export class DiscordAdapter {
  constructor(
    @InjectModel(DiscordIntegrationDocument.name) private readonly integrations: Model<DiscordIntegrationHydratedDocument>,
    private readonly encryption: CredentialEncryptionService,
    private readonly projects: ProjectsService,
  ) {}
  private webhookUrl(value: string): URL {
    const url = new URL(value);
    const hostAllowed = url.hostname === "discord.com" || url.hostname === "discordapp.com";
    const pathAllowed = /^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(url.pathname);
    if (url.protocol !== "https:" || !hostAllowed || !pathAllowed) throw new UnauthorizedException("Invalid Discord webhook URL.");
    return url;
  }
  async connect(workspaceId: string, dto: ConnectDiscordDto): Promise<Record<string, unknown>> {
    await this.projects.getByKey(workspaceId, dto.projectKey);
    const url = this.webhookUrl(dto.webhookUrl);
    const response = await fetch(url, { headers: { "user-agent": "Tasks-Dash/1.0" } });
    if (!response.ok) throw new UnauthorizedException("Discord rejected the webhook URL.");
    const metadata = (await response.json()) as DiscordWebhookMetadata;
    const integration = await this.integrations.findOneAndUpdate(
      { workspaceId, projectKey: dto.projectKey.toUpperCase() },
      { $set: { workspaceId, projectKey: dto.projectKey.toUpperCase(), encryptedWebhookUrl: this.encryption.encrypt(url.toString()), webhookName: metadata.name ?? "Tasks Dash", channelId: metadata.channel_id, enabled: true }, $unset: { lastError: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).exec();
    await this.send(workspaceId, integration.projectKey, "Tasks Dash connected", "Discord automation is connected to this project.");
    return this.statusOf(integration);
  }
  async list(workspaceId: string): Promise<Record<string, unknown>[]> {
    return (await this.integrations.find({ workspaceId }).sort({ projectKey: 1 }).exec()).map((item) => this.statusOf(item));
  }
  async disconnect(workspaceId: string, projectKey: string): Promise<void> {
    await this.integrations.deleteOne({ workspaceId, projectKey: projectKey.toUpperCase() }).exec();
  }
  async send(workspaceId: string, projectKey: string, title: string, description: string): Promise<void> {
    const integration = await this.integrations.findOne({ workspaceId, projectKey: projectKey.toUpperCase(), enabled: true }).exec();
    if (!integration) throw new ServiceUnavailableException(`Discord is not connected for ${projectKey.toUpperCase()}.`);
    const url = this.webhookUrl(this.encryption.decrypt(integration.encryptedWebhookUrl));
    url.searchParams.set("wait", "true");
    const body = JSON.stringify({ username: "Tasks Dash", allowed_mentions: { parse: [] }, embeds: [{ title: title.slice(0, 256), description: description.slice(0, 4000), timestamp: new Date().toISOString() }] });
    const request = () => fetch(url, { method: "POST", headers: { "content-type": "application/json", "user-agent": "Tasks-Dash/1.0" }, body });
    let response = await request();
    if (response.status === 429) {
      const rate = (await response.json().catch(() => ({ retry_after: 1 }))) as { retry_after?: number };
      await new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(Number(rate.retry_after ?? 1) * 1000, 250), 5000)));
      response = await request();
    }
    if (!response.ok) {
      const error = `Discord webhook failed with HTTP ${response.status}.`;
      await this.integrations.updateOne({ _id: integration._id }, { lastError: error }).exec();
      throw new ServiceUnavailableException(error);
    }
    await this.integrations.updateOne({ _id: integration._id }, { $set: { lastSuccessAt: new Date() }, $unset: { lastError: 1 } }).exec();
  }
  private statusOf(item: DiscordIntegrationDocument): Record<string, unknown> {
    return { projectKey: item.projectKey, webhookName: item.webhookName, channelId: item.channelId, enabled: item.enabled, connected: true, lastSuccessAt: item.lastSuccessAt ?? null, lastError: item.lastError ?? null };
  }
}
