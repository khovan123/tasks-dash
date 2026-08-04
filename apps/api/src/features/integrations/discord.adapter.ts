import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import {
  PROJECT_CREATED_EVENT,
  ProjectCreatedEvent,
} from "../projects/projects.service";
import { ProjectsService } from "../projects/projects.service";
import {
  ConfigureDiscordWorkspaceDto,
  ConnectDiscordDto,
  DiscordIntegrationDocument,
  DiscordIntegrationHydratedDocument,
  DiscordWorkspaceDocument,
  DiscordWorkspaceHydratedDocument,
  ProvisionDiscordProjectDto,
} from "./integration.schemas";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_BOT_PERMISSIONS = 536870928;
const DISCORD_TEXT_CHANNEL = 0;
const DISCORD_CATEGORY_CHANNEL = 4;

export const DISCORD_PROJECT_PROVISIONED_EVENT =
  "integrations.discord.project-provisioned";

export interface DiscordProjectProvisionedEvent {
  workspaceId: string;
  projectKey: string;
  guildId: string;
  channelId: string;
}

interface DiscordWebhookMetadata {
  id: string;
  name: string | null;
  channel_id: string;
  guild_id?: string;
  token?: string;
}

interface DiscordGuild {
  id: string;
  name: string;
}

interface DiscordChannel {
  id: string;
  guild_id?: string;
  name: string;
  type: number;
  parent_id?: string | null;
}

interface DiscordApiError {
  message?: string;
  code?: number;
  retry_after?: number;
}

function stripDiacritics(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeDiscordChannelName(
  templateOrName: string,
  projectKey: string,
  projectName: string,
): string {
  const rendered = templateOrName
    .replaceAll("{{projectKey}}", projectKey)
    .replaceAll("{{projectName}}", projectName);
  const normalized = stripDiacritics(rendered)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 100);
  return normalized || `${projectKey.toLowerCase()}-updates`;
}

@Injectable()
export class DiscordAdapter {
  constructor(
    @InjectModel(DiscordWorkspaceDocument.name)
    private readonly workspaces: Model<DiscordWorkspaceHydratedDocument>,
    @InjectModel(DiscordIntegrationDocument.name)
    private readonly integrations: Model<DiscordIntegrationHydratedDocument>,
    private readonly encryption: CredentialEncryptionService,
    private readonly projects: ProjectsService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  installUrl(): string {
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set(
      "client_id",
      this.config.getOrThrow<string>("DISCORD_APPLICATION_ID"),
    );
    url.searchParams.set("scope", "bot");
    url.searchParams.set("permissions", String(DISCORD_BOT_PERMISSIONS));
    return url.toString();
  }

  private webhookUrl(value: string): URL {
    const url = new URL(value);
    const hostAllowed =
      url.hostname === "discord.com" || url.hostname === "discordapp.com";
    const pathAllowed =
      /^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(
        url.pathname,
      );
    if (url.protocol !== "https:" || !hostAllowed || !pathAllowed) {
      throw new UnauthorizedException("Invalid Discord webhook URL.");
    }
    return url;
  }

  private async botRequest<T>(
    path: string,
    init: RequestInit = {},
    auditReason?: string,
  ): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set(
      "authorization",
      `Bot ${this.config.getOrThrow<string>("DISCORD_BOT_TOKEN")}`,
    );
    headers.set("user-agent", "Tasks-Dash/1.0");
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (auditReason) {
      headers.set("x-audit-log-reason", encodeURIComponent(auditReason).slice(0, 512));
    }

    const request = () =>
      fetch(`${DISCORD_API_BASE}${path}`, { ...init, headers });
    let response = await request();
    if (response.status === 429) {
      const rate = (await response
        .json()
        .catch(() => ({ retry_after: 1 }))) as DiscordApiError;
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.min(
            Math.max(Number(rate.retry_after ?? 1) * 1000, 250),
            5000,
          ),
        ),
      );
      response = await request();
    }

    if (!response.ok) {
      const error = (await response
        .json()
        .catch(() => ({}))) as DiscordApiError;
      const message =
        error.message ?? `Discord API failed with HTTP ${response.status}.`;
      if (response.status === 401) {
        throw new UnauthorizedException(message);
      }
      if (response.status === 403) {
        throw new ForbiddenException(message);
      }
      throw new ServiceUnavailableException(message);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async workspaceStatus(workspaceId: string): Promise<Record<string, unknown>> {
    const integration = await this.workspaces.findOne({ workspaceId }).exec();
    return {
      botConfigured: Boolean(
        this.config.get<string>("DISCORD_APPLICATION_ID") &&
          this.config.get<string>("DISCORD_BOT_TOKEN"),
      configured: Boolean(integration),
      guildId: integration?.guildId ?? null,
      guildName: integration?.guildName ?? null,
      categoryId: integration?.categoryId ?? null,
      categoryName: integration?.categoryName ?? null,
      channelNameTemplate:
        integration?.channelNameTemplate ?? "{{projectKey}}-updates",
      enabled: integration?.enabled ?? false,
      lastProvisionedAt: integration?.lastProvisionedAt ?? null,
      lastError: integration?.lastError ?? null,
      installUrl: this.installUrl(),
    };
  }

  async configureWorkspace(
    workspaceId: string,
    dto: ConfigureDiscordWorkspaceDto,
  ): Promise<Record<string, unknown>> {
    const guild = await this.botRequest<DiscordGuild>(`/guilds/${dto.guildId}`);
    const channels = await this.botRequest<DiscordChannel[]>(
      `/guilds/${dto.guildId}/channels`,
    );
    const category = dto.categoryId
      ? channels.find(
          (channel) =>
            channel.id === dto.categoryId &&
            channel.type === DISCORD_CATEGORY_CHANNEL,
        )
      : undefined;
    if (dto.categoryId && !category) {
      throw new BadRequestException(
        "Discord categoryId must belong to the selected guild and be a category channel.",
      );
    }

    const channelNameTemplate =
      dto.channelNameTemplate?.trim() || "{{projectKey}}-updates";
    if (
      !channelNameTemplate.includes("{{projectKey}}") &&
      !channelNameTemplate.includes("{{projectName}}")
    ) {
      throw new BadRequestException(
        "channelNameTemplate must contain {{projectKey}} or {{projectName}}.",
      );
    }

    const integration = await this.workspaces
      .findOneAndUpdate(
        { workspaceId },
        {
          $set: {
            workspaceId,
            guildId: guild.id,
            guildName: guild.name,
            categoryId: category?.id,
            categoryName: category?.name,
            channelNameTemplate,
            enabled: true,
            configuredAt: new Date(),
          },
          $unset: { lastError: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    const provisioned = await this.provisionAll(workspaceId);
    return {
      ...(await this.workspaceStatus(workspaceId)),
      provisionedProjects: provisioned.provisionedProjects,
      failedProjects: provisioned.failedProjects,
      guildName: integration.guildName,
    };
  }

  async provisionAll(workspaceId: string): Promise<{
    provisionedProjects: string[];
    failedProjects: Array<{ projectKey: string; error: string }>;
  }> {
    const projects = await this.projects.list(workspaceId);
    const provisionedProjects: string[] = [];
    const failedProjects: Array<{ projectKey: string; error: string }> = [];
    for (const project of projects) {
      try {
        await this.provisionProject(workspaceId, project.key, {});
        provisionedProjects.push(project.key);
      } catch (error) {
        failedProjects.push({
          projectKey: project.key,
          error: error instanceof Error ? error.message : "Unknown Discord error",
        });
      }
    }
    return { provisionedProjects, failedProjects };
  }

  async provisionProject(
    workspaceId: string,
    projectKey: string,
    dto: ProvisionDiscordProjectDto,
  ): Promise<Record<string, unknown>> {
    const project = await this.projects.getByKey(workspaceId, projectKey);
    const workspace = await this.workspaces
      .findOne({ workspaceId, enabled: true })
      .exec();
    if (!workspace) {
      throw new ServiceUnavailableException(
        "Discord workspace bot configuration is required before provisioning project channels.",
      );
    }

    const existing = await this.integrations
      .findOne({ workspaceId, projectKey: project.key })
      .exec();
    if (existing?.enabled) return this.statusOf(existing);

    try {
      const channels = await this.botRequest<DiscordChannel[]>(
        `/guilds/${workspace.guildId}/channels`,
      );
      const channelName = normalizeDiscordChannelName(
        dto.channelName?.trim() || workspace.channelNameTemplate,
        project.key,
        project.name,
      );
      const parentId = workspace.categoryId ?? null;
      let channel = channels.find(
        (candidate) =>
          candidate.type === DISCORD_TEXT_CHANNEL &&
          candidate.name === channelName &&
          (candidate.parent_id ?? null) === parentId,
      );

      if (!channel) {
        channel = await this.botRequest<DiscordChannel>(
          `/guilds/${workspace.guildId}/channels`,
          {
            method: "POST",
            body: JSON.stringify({
              name: channelName,
              type: DISCORD_TEXT_CHANNEL,
              topic:
                dto.topic?.trim() ||
                `Tasks Dash updates for ${project.key} · ${project.name}`.slice(
                  0,
                  1024,
                ),
              parent_id: parentId,
            }),
          },
          `Tasks Dash project ${project.key} channel provisioning`,
        );
      }

      const webhook = await this.botRequest<DiscordWebhookMetadata>(
        `/channels/${channel.id}/webhooks`,
        {
          method: "POST",
          body: JSON.stringify({
            name: `Tasks Dash ${project.key}`.slice(0, 80),
          }),
        },
        `Tasks Dash project ${project.key} webhook provisioning`,
      );
      if (!webhook.id || !webhook.token) {
        throw new ServiceUnavailableException(
          "Discord did not return an executable incoming webhook token.",
        );
      }
      const webhookUrl = new URL(
        `/api/webhooks/${webhook.id}/${webhook.token}`,
        "https://discord.com",
      );
      const integration = await this.integrations
        .findOneAndUpdate(
          { workspaceId, projectKey: project.key },
          {
            $set: {
              workspaceId,
              projectKey: project.key,
              encryptedWebhookUrl: this.encryption.encrypt(
                webhookUrl.toString(),
              ),
              webhookName: webhook.name ?? `Tasks Dash ${project.key}`,
              webhookId: webhook.id,
              channelId: channel.id,
              channelName: channel.name,
              guildId: workspace.guildId,
              provisionedBy: "BOT",
              enabled: true,
              provisionedAt: new Date(),
            },
            $unset: { lastError: 1 },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .exec();

      await this.workspaces
        .updateOne(
          { _id: workspace._id },
          {
            $set: { lastProvisionedAt: new Date() },
            $unset: { lastError: 1 },
          },
        )
        .exec();

      await this.send(
        workspaceId,
        project.key,
        `${project.key} connected`,
        `This channel is managed by Tasks Dash for ${project.name}. GitHub pull request automation is ready.`,
      );
      await this.events.emitAsync(DISCORD_PROJECT_PROVISIONED_EVENT, {
        workspaceId,
        projectKey: project.key,
        guildId: workspace.guildId,
        channelId: channel.id,
      } satisfies DiscordProjectProvisionedEvent);
      return this.statusOf(integration);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Discord error";
      await this.workspaces
        .updateOne(
          { workspaceId },
          { $set: { lastError: message } },
        )
        .exec();
      throw error;
    }
  }

  @OnEvent(PROJECT_CREATED_EVENT, { async: true })
  async onProjectCreated(event: ProjectCreatedEvent): Promise<void> {
    const configured = await this.workspaces.exists({
      workspaceId: event.workspaceId,
      enabled: true,
    });
    if (!configured) return;
    await this.provisionProject(event.workspaceId, event.projectKey, {});
  }

  async connect(
    workspaceId: string,
    dto: ConnectDiscordDto,
  ): Promise<Record<string, unknown>> {
    await this.projects.getByKey(workspaceId, dto.projectKey);
    const url = this.webhookUrl(dto.webhookUrl);
    const response = await fetch(url, {
      headers: { "user-agent": "Tasks-Dash/1.0" },
    });
    if (!response.ok) {
      throw new UnauthorizedException("Discord rejected the webhook URL.");
    }
    const metadata = (await response.json()) as DiscordWebhookMetadata;
    const integration = await this.integrations
      .findOneAndUpdate(
        { workspaceId, projectKey: dto.projectKey.toUpperCase() },
        {
          $set: {
            workspaceId,
            projectKey: dto.projectKey.toUpperCase(),
            encryptedWebhookUrl: this.encryption.encrypt(url.toString()),
            webhookName: metadata.name ?? "Tasks Dash",
            webhookId: metadata.id,
            channelId: metadata.channel_id,
            guildId: metadata.guild_id,
            provisionedBy: "MANUAL",
            enabled: true,
            provisionedAt: new Date(),
          },
          $unset: { lastError: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    await this.send(
      workspaceId,
      integration.projectKey,
      "Tasks Dash connected",
      "Discord automation is connected to this project.",
    );
    await this.events.emitAsync(DISCORD_PROJECT_PROVISIONED_EVENT, {
      workspaceId,
      projectKey: integration.projectKey,
      guildId: integration.guildId ?? "manual",
      channelId: integration.channelId,
    } satisfies DiscordProjectProvisionedEvent);
    return this.statusOf(integration);
  }

  async list(workspaceId: string): Promise<Record<string, unknown>[]> {
    return (
      await this.integrations.find({ workspaceId }).sort({ projectKey: 1 }).exec()
    ).map((item) => this.statusOf(item));
  }

  async disconnect(workspaceId: string, projectKey: string): Promise<void> {
    await this.integrations
      .deleteOne({ workspaceId, projectKey: projectKey.toUpperCase() })
      .exec();
  }

  async send(
    workspaceId: string,
    projectKey: string,
    title: string,
    description: string,
  ): Promise<void> {
    const integration = await this.integrations
      .findOne({
        workspaceId,
        projectKey: projectKey.toUpperCase(),
        enabled: true,
      })
      .exec();
    if (!integration) {
      throw new ServiceUnavailableException(
        `Discord is not connected for ${projectKey.toUpperCase()}.`,
      );
    }
    const url = this.webhookUrl(
      this.encryption.decrypt(integration.encryptedWebhookUrl),
    );
    url.searchParams.set("wait", "true");
    const body = JSON.stringify({
      username: "Tasks Dash",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: title.slice(0, 256),
          description: description.slice(0, 4000),
          timestamp: new Date().toISOString(),
        },
      ],
    });
    const request = () =>
      fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Tasks-Dash/1.0",
        },
        body,
      });
    let response = await request();
    if (response.status === 429) {
      const rate = (await response
        .json()
        .catch(() => ({ retry_after: 1 }))) as { retry_after?: number };
      await new Promise((resolve) =>
        setTimeout(
          resolve,
          Math.min(
            Math.max(Number(rate.retry_after ?? 1) * 1000, 250),
            5000,
          ),
        ),
      );
      response = await request();
    }
    if (!response.ok) {
      const error = `Discord webhook failed with HTTP ${response.status}.`;
      await this.integrations
        .updateOne({ _id: integration._id }, { lastError: error })
        .exec();
      throw new ServiceUnavailableException(error);
    }
    await this.integrations
      .updateOne(
        { _id: integration._id },
        {
          $set: { lastSuccessAt: new Date() },
          $unset: { lastError: 1 },
        },
      )
      .exec();
  }

  private statusOf(item: DiscordIntegrationDocument): Record<string, unknown> {
    return {
      projectKey: item.projectKey,
      webhookName: item.webhookName,
      webhookId: item.webhookId ?? null,
      channelId: item.channelId,
      channelName: item.channelName ?? null,
      guildId: item.guildId ?? null,
      provisionedBy: item.provisionedBy,
      provisionedAt: item.provisionedAt ?? null,
      enabled: item.enabled,
      connected: true,
      lastSuccessAt: item.lastSuccessAt ?? null,
      lastError: item.lastError ?? null,
    };
  }
}
