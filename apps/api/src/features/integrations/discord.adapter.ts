import {
  BadRequestException,
  ConflictException,
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
  PROJECT_DELETED_EVENT,
  ProjectDeletedEvent,
  ProjectsService,
} from "../projects/projects.service";
import {
  ConfigureDiscordWorkspaceDto,
  ConnectDiscordDto,
  DiscordIntegrationDocument,
  DiscordIntegrationHydratedDocument,
  DiscordWorkspaceDocument,
  DiscordWorkspaceHydratedDocument,
  ProvisionDiscordProjectDto,
} from "./integration.schemas";
import { MemberDocument, MemberHydratedDocument } from "../members/member.schema";
import { MEMBER_ROLES } from "@tasks-dash/contracts";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_BOT_PERMISSIONS = 536980496;
const DISCORD_TEXT_CHANNEL = 0;
const DISCORD_VOICE_CHANNEL = 2;
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
interface DiscordRole {
  id: string;
  name: string;
  permissions: string;
  position: number;
  color: number;
  hoist: boolean;
  managed: boolean;
  mentionable: boolean;
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
  return normalized || `${projectKey.toLowerCase()}-tasks`;
}

@Injectable()
export class DiscordAdapter {
  constructor(
    @InjectModel(DiscordWorkspaceDocument.name)
    private readonly workspaces: Model<DiscordWorkspaceHydratedDocument>,
    @InjectModel(DiscordIntegrationDocument.name)
    private readonly integrations: Model<DiscordIntegrationHydratedDocument>,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberHydratedDocument>,
    private readonly encryption: CredentialEncryptionService,
    private readonly projects: ProjectsService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {}

  installUrl(state?: string): string {
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set(
      "client_id",
      this.config.getOrThrow<string>("DISCORD_APPLICATION_ID"),
    );
    url.searchParams.set("scope", "bot");
    url.searchParams.set("permissions", String(DISCORD_BOT_PERMISSIONS));
    if (state) {
      url.searchParams.set("state", state);
    }
    return url.toString();
  }

  private webhookUrl(value: string): URL {
    const url = new URL(value);
    const hostAllowed =
      url.hostname === "discord.com" || url.hostname === "discordapp.com";
    const pathAllowed =
      /^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(url.pathname);
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
    if (init.body && !headers.has("content-type"))
      headers.set("content-type", "application/json");
    if (auditReason) {
      headers.set(
        "x-audit-log-reason",
        encodeURIComponent(auditReason).slice(0, 512),
      );
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
          Math.min(Math.max(Number(rate.retry_after ?? 1) * 1000, 250), 5000),
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
      if (response.status === 401) throw new UnauthorizedException(message);
      if (response.status === 403) throw new ForbiddenException(message);
      throw new ServiceUnavailableException(message);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private validateTemplate(value: string, key: string): void {
    if (
      !value.includes("{{projectKey}}") &&
      !value.includes("{{projectName}}")
    ) {
      throw new BadRequestException(
        `${key} must contain {{projectKey}} or {{projectName}}.`,
      );
    }
  }

  private async ensureCategoryChannel(
    guildId: string,
    channels: DiscordChannel[],
    name: string,
    auditReason: string,
  ): Promise<DiscordChannel> {
    const existing = channels.find(
      (channel) =>
        channel.type === DISCORD_CATEGORY_CHANNEL &&
        channel.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;
    const created = await this.botRequest<DiscordChannel>(
      `/guilds/${guildId}/channels`,
      {
        method: "POST",
        body: JSON.stringify({
          name: name.slice(0, 100),
          type: DISCORD_CATEGORY_CHANNEL,
        }),
      },
      auditReason,
    );
    channels.push(created);
    return created;
  }

  private async ensureTextChannel(
    guildId: string,
    channels: DiscordChannel[],
    name: string,
    parentId: string | null,
    topic: string,
    auditReason: string,
    preferredId?: string,
  ): Promise<DiscordChannel> {
    const existing = channels.find(
      (channel) =>
        channel.type === DISCORD_TEXT_CHANNEL &&
        ((preferredId && channel.id === preferredId) ||
          (channel.name === name && (channel.parent_id ?? null) === parentId)),
    );
    if (existing) return existing;
    const created = await this.botRequest<DiscordChannel>(
      `/guilds/${guildId}/channels`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          type: DISCORD_TEXT_CHANNEL,
          topic: topic.slice(0, 1024),
          parent_id: parentId,
        }),
      },
      auditReason,
    );
    channels.push(created);
    return created;
  }

  private async ensureVoiceChannel(
    guildId: string,
    channels: DiscordChannel[],
    name: string,
    parentId: string | null,
    auditReason: string,
    preferredId?: string,
  ): Promise<DiscordChannel> {
    const existing = channels.find(
      (channel) =>
        channel.type === DISCORD_VOICE_CHANNEL &&
        ((preferredId && channel.id === preferredId) ||
          (channel.name === name && (channel.parent_id ?? null) === parentId)),
    );
    if (existing) return existing;
    const created = await this.botRequest<DiscordChannel>(
      `/guilds/${guildId}/channels`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          type: DISCORD_VOICE_CHANNEL,
          parent_id: parentId,
        }),
      },
      auditReason,
    );
    channels.push(created);
    return created;
  }

  async listAvailableGuilds(
    workspaceId?: string,
  ): Promise<Array<{ id: string; name: string; disabled?: boolean }>> {
    if (!this.config.get<string>("DISCORD_BOT_TOKEN")) return [];
    try {
      const guilds =
        await this.botRequest<Array<{ id: string; name: string }>>(
          "/users/@me/guilds",
        );
      const linkedWorkspaces = await this.workspaces.find({}).lean().exec();
      const linkedGuildMap = new Map(
        linkedWorkspaces.map((w) => [w.guildId, w.workspaceId]),
      );

      return guilds.map((guild) => {
        const boundWorkspaceId = linkedGuildMap.get(guild.id);
        const isBoundToOther = Boolean(
          boundWorkspaceId && boundWorkspaceId !== workspaceId,
        );
        return {
          id: guild.id,
          name: isBoundToOther
            ? `${guild.name} (Đã dùng bởi workspace khác)`
            : guild.name,
          disabled: isBoundToOther,
        };
      });
    } catch {
      return [];
    }
  }

  async workspaceStatus(workspaceId: string): Promise<Record<string, unknown>> {
    const integration = await this.workspaces.findOne({ workspaceId }).exec();
    const botConfigured = Boolean(
      this.config.get<string>("DISCORD_APPLICATION_ID") &&
      this.config.get<string>("DISCORD_BOT_TOKEN"),
    );
    const availableGuilds = botConfigured
      ? await this.listAvailableGuilds(workspaceId)
      : [];
    return {
      botConfigured,
      configured: Boolean(integration),
      guildId: integration?.guildId ?? null,
      guildName: integration?.guildName ?? null,
      categoryId: integration?.categoryId ?? null,
      categoryName: integration?.categoryName ?? null,
      channelNameTemplate:
        integration?.channelNameTemplate ?? "{{projectKey}}-tasks",
      docsChannelNameTemplate:
        integration?.docsChannelNameTemplate ?? "{{projectKey}}-docs",
      enabled: integration?.enabled ?? false,
      lastProvisionedAt: integration?.lastProvisionedAt ?? null,
      lastError: integration?.lastError ?? null,
      installUrl: botConfigured ? this.installUrl() : null,
      availableGuilds,
    };
  }

  async configureWorkspace(
    workspaceId: string,
    dto: ConfigureDiscordWorkspaceDto,
  ): Promise<Record<string, unknown>> {
    // Strict 1-to-1 relationship check: Ensure guildId is not linked to another workspace
    const existingOtherWorkspace = await this.workspaces
      .findOne({
        guildId: dto.guildId,
        workspaceId: { $ne: workspaceId },
      })
      .exec();
    if (existingOtherWorkspace) {
      throw new ConflictException(
        `Server Discord này đã được liên kết với một Workspace khác. Mỗi Workspace chỉ được liên kết với 1 Server Discord duy nhất (mối quan hệ 1-1).`,
      );
    }

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
      dto.channelNameTemplate?.trim() || "{{projectKey}}-tasks";
    const docsChannelNameTemplate =
      dto.docsChannelNameTemplate?.trim() || "{{projectKey}}-docs";
    this.validateTemplate(channelNameTemplate, "channelNameTemplate");
    this.validateTemplate(docsChannelNameTemplate, "docsChannelNameTemplate");

    const setValues: Record<string, unknown> = {
      workspaceId,
      guildId: guild.id,
      guildName: guild.name,
      channelNameTemplate,
      docsChannelNameTemplate,
      enabled: true,
      configuredAt: new Date(),
    };
    const unsetValues: Record<string, 1> = { lastError: 1 };
    if (category) {
      setValues.categoryId = category.id;
      setValues.categoryName = category.name;
    } else {
      unsetValues.categoryId = 1;
      unsetValues.categoryName = 1;
    }
    const integration = await this.workspaces
      .findOneAndUpdate(
        { workspaceId },
        { $set: setValues, $unset: unsetValues },
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
          error:
            error instanceof Error ? error.message : "Unknown Discord error",
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
    try {
      const existing = await this.integrations
        .findOne({ workspaceId, projectKey: project.key })
        .exec();
      const channels = await this.botRequest<DiscordChannel[]>(
        `/guilds/${workspace.guildId}/channels`,
      );
      let parentId = workspace.categoryId ?? null;
      if (!parentId) {
        const categoryFolder = await this.ensureCategoryChannel(
          workspace.guildId,
          channels,
          `TASKS DASH - ${project.key.toUpperCase()}`,
          `Tasks Dash category folder for project ${project.key}`,
        );
        parentId = categoryFolder.id;
      }
      const generalName = `${project.key.toLowerCase()}-general`;
      const updatesName = normalizeDiscordChannelName(
        dto.channelName?.trim() || workspace.channelNameTemplate,
        project.key,
        project.name,
      );
      const deploymentName = `${project.key.toLowerCase()}-deployment`;
      const docsName = normalizeDiscordChannelName(
        dto.docsChannelName?.trim() || workspace.docsChannelNameTemplate,
        project.key,
        project.name,
      );
      const designerName = `${project.key.toLowerCase()}-design`;
      const membersName = `${project.key.toLowerCase()}-members`;
      const reportsName = `${project.key.toLowerCase()}-reports`;
      const meetingName = `${project.key.toLowerCase()}-meeting`;

      const canReuseManual =
        existing?.enabled &&
        existing.provisionedBy === "MANUAL" &&
        existing.guildId === workspace.guildId;

      const [
        generalChannel,
        updatesChannel,
        deploymentChannel,
        docsChannel,
        designerChannel,
        membersChannel,
        reportsChannel,
        meetingChannel,
      ] = await Promise.all([
        this.ensureTextChannel(
          workspace.guildId,
          channels,
          generalName,
          parentId,
          `General discussions for project ${project.key} · ${project.name}`,
          `Tasks Dash general channel for ${project.key}`,
          existing?.generalChannelId,
        ),
        canReuseManual
          ? (channels.find((channel) => channel.id === existing.channelId) ??
            ({
              id: existing.channelId,
              name: existing.channelName ?? updatesName,
              type: DISCORD_TEXT_CHANNEL,
            } as DiscordChannel))
          : this.ensureTextChannel(
              workspace.guildId,
              channels,
              updatesName,
              parentId,
              dto.topic?.trim() ||
                `Tasks Dash updates for ${project.key} · ${project.name}`,
              `Tasks Dash project ${project.key} updates channel provisioning`,
              existing?.provisionedBy === "BOT"
                ? existing.channelId
                : undefined,
            ),
        this.ensureTextChannel(
          workspace.guildId,
          channels,
          deploymentName,
          parentId,
          `CI/CD deployment logs for project ${project.key} · ${project.name}`,
          `Tasks Dash deployment channel for ${project.key}`,
          existing?.deploymentChannelId,
        ),
        this.ensureTextChannel(
          workspace.guildId,
          channels,
          docsName,
          parentId,
          `Tasks Dash document attachments for ${project.key} · ${project.name}`,
          `Tasks Dash project ${project.key} docs channel provisioning`,
          existing?.docsChannelId,
        ),
        this.ensureTextChannel(
          workspace.guildId,
          channels,
          designerName,
          parentId,
          `Design catalog & Figma links for ${project.key} · ${project.name}`,
          `Tasks Dash designer channel for ${project.key}`,
          existing?.designerChannelId,
        ),
        this.ensureTextChannel(
          workspace.guildId,
          channels,
          membersName,
          parentId,
          `Project members directory for ${project.key} · ${project.name}`,
          `Tasks Dash members channel for ${project.key}`,
          existing?.membersChannelId,
        ),
        this.ensureTextChannel(
          workspace.guildId,
          channels,
          reportsName,
          parentId,
          `Daily completed task reports for ${project.key} · ${project.name}`,
          `Tasks Dash reports channel for ${project.key}`,
          existing?.reportsChannelId,
        ),
        this.ensureVoiceChannel(
          workspace.guildId,
          channels,
          meetingName,
          parentId,
          `Tasks Dash meeting voice channel for ${project.key}`,
          existing?.meetingChannelId,
        ),
      ]);

      let encryptedWebhookUrl = existing?.encryptedWebhookUrl;
      let webhookId = existing?.webhookId;
      let webhookName = existing?.webhookName;
      let provisionedBy: "BOT" | "MANUAL" = canReuseManual ? "MANUAL" : "BOT";
      if (
        !encryptedWebhookUrl ||
        existing?.channelId !== updatesChannel.id ||
        existing.guildId !== workspace.guildId
      ) {
        const webhook = await this.botRequest<DiscordWebhookMetadata>(
          `/channels/${updatesChannel.id}/webhooks`,
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
        encryptedWebhookUrl = this.encryption.encrypt(
          new URL(
            `/api/webhooks/${webhook.id}/${webhook.token}`,
            "https://discord.com",
          ).toString(),
        );
        webhookId = webhook.id;
        webhookName = webhook.name ?? `Tasks Dash ${project.key}`;
        provisionedBy = "BOT";
      }

      const integration = await this.integrations
        .findOneAndUpdate(
          { workspaceId, projectKey: project.key },
          {
            $set: {
              workspaceId,
              projectKey: project.key,
              encryptedWebhookUrl,
              webhookName,
              webhookId,
              channelId: updatesChannel.id,
              channelName: updatesChannel.name,
              docsChannelId: docsChannel.id,
              docsChannelName: docsChannel.name,
              generalChannelId: generalChannel.id,
              generalChannelName: generalChannel.name,
              deploymentChannelId: deploymentChannel.id,
              deploymentChannelName: deploymentChannel.name,
              designerChannelId: designerChannel.id,
              designerChannelName: designerChannel.name,
              membersChannelId: membersChannel.id,
              membersChannelName: membersChannel.name,
              reportsChannelId: reportsChannel.id,
              reportsChannelName: reportsChannel.name,
              meetingChannelId: meetingChannel.id,
              meetingChannelName: meetingChannel.name,
              guildId: workspace.guildId,
              provisionedBy,
              enabled: true,
              provisionedAt: new Date(),
            },
            $unset: { lastError: 1 },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .exec();

      await this.projects.linkDiscordChannels(workspaceId, project.key, {
        guildId: workspace.guildId,
        updatesChannelId: updatesChannel.id,
        updatesChannelName: updatesChannel.name,
        docsChannelId: docsChannel.id,
        docsChannelName: docsChannel.name,
      });
      await this.workspaces
        .updateOne(
          { _id: workspace._id },
          { $set: { lastProvisionedAt: new Date() }, $unset: { lastError: 1 } },
        )
        .exec();
      await this.send(
        workspaceId,
        project.key,
        `${project.key} connected`,
        `8 dedicated channels created under folder TASKS DASH - ${project.key.toUpperCase()}:\n• #${generalChannel.name}\n• #${updatesChannel.name}\n• #${deploymentChannel.name}\n• #${docsChannel.name}\n• #${designerChannel.name}\n• #${membersChannel.name}\n• #${reportsChannel.name}\n• #${meetingChannel.name}`,
      );
      await this.events.emitAsync(DISCORD_PROJECT_PROVISIONED_EVENT, {
        workspaceId,
        projectKey: project.key,
        guildId: workspace.guildId,
        channelId: updatesChannel.id,
      } satisfies DiscordProjectProvisionedEvent);
      return this.statusOf(integration);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Discord error";
      await this.workspaces
        .updateOne({ workspaceId }, { $set: { lastError: message } })
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

  @OnEvent(PROJECT_DELETED_EVENT, { async: true })
  async onProjectDeleted(event: ProjectDeletedEvent): Promise<void> {
    await this.deleteProjectChannels(event.workspaceId, event.projectKey);
  }

  async ensureWorkspaceRoles(guildId: string): Promise<Record<string, string>> {
    const roles = await this.botRequest<DiscordRole[]>(`/guilds/${guildId}/roles`);
    const mappedRoles: Record<string, string> = {};
    const expectedRoles = {
      [MEMBER_ROLES.owner]: "Tasks Dash Owner",
      [MEMBER_ROLES.viewer]: "Tasks Dash Viewer",
      [MEMBER_ROLES.designer]: "Tasks Dash Designer",
      [MEMBER_ROLES.dev]: "Tasks Dash Dev",
      [MEMBER_ROLES.ba]: "Tasks Dash BA",
    };

    for (const [roleKey, roleName] of Object.entries(expectedRoles)) {
      const existing = roles.find((r) => r.name === roleName);
      if (existing) {
        mappedRoles[roleKey] = existing.id;
      } else {
        const created = await this.botRequest<DiscordRole>(`/guilds/${guildId}/roles`, {
          method: "POST",
          body: JSON.stringify({ name: roleName }),
        });
        mappedRoles[roleKey] = created.id;
      }
    }
    return mappedRoles;
  }

  async syncMemberWorkspaceRole(
    guildId: string,
    discordUserId: string,
    workspaceRole: string,
    roleMap: Record<string, string>,
  ): Promise<void> {
    const member = await this.botRequest<{ roles: string[] }>(
      `/guilds/${guildId}/members/${discordUserId}`,
    );

    const targetRoleId = roleMap[workspaceRole];
    const allWorkspaceRoleIds = Object.values(roleMap);

    if (targetRoleId && !member.roles.includes(targetRoleId)) {
      await this.botRequest(
        `/guilds/${guildId}/members/${discordUserId}/roles/${targetRoleId}`,
        { method: "PUT" },
      );
    }

    for (const roleId of allWorkspaceRoleIds) {
      if (roleId !== targetRoleId && member.roles.includes(roleId)) {
        await this.botRequest(
          `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
          { method: "DELETE" },
        );
      }
    }
  }

  async syncMemberRolesAndPermissions(workspaceId: string): Promise<void> {
    const workspace = await this.workspaces.findOne({ workspaceId, enabled: true }).exec();
    if (!workspace) return;

    try {
      const members = await this.members.find({ workspaceId }).exec();
      const roleMap = await this.ensureWorkspaceRoles(workspace.guildId);

      for (const member of members) {
        if (member.discordUsername) {
          const discordUserId = await this.findGuildMemberId(workspace.guildId, member.discordUsername);
          if (discordUserId) {
            await this.syncMemberWorkspaceRole(workspace.guildId, discordUserId, member.role, roleMap);
          }
        }
      }

      const integrations = await this.integrations.find({ workspaceId, enabled: true }).exec();
      for (const integration of integrations) {
        await this.syncProjectPermissionsInternal(workspace, integration, members);
      }
    } catch (e) {
      console.error("Failed to sync Discord roles and permissions:", e);
    }
  }

  async syncProjectPermissions(workspaceId: string, projectKey: string): Promise<void> {
    const workspace = await this.workspaces.findOne({ workspaceId, enabled: true }).exec();
    if (!workspace) return;
    const integration = await this.integrations.findOne({ workspaceId, projectKey: projectKey.toUpperCase() }).exec();
    if (!integration) return;

    try {
      const members = await this.members.find({ workspaceId }).exec();
      await this.syncProjectPermissionsInternal(workspace, integration, members);
    } catch (e) {
      console.error("Failed to sync project permissions:", e);
    }
  }

  private async syncProjectPermissionsInternal(
    workspace: DiscordWorkspaceDocument,
    integration: DiscordIntegrationDocument,
    members: any[],
  ): Promise<void> {
    try {
      const project = await this.projects.getByKey(workspace.workspaceId, integration.projectKey);
      if (!project) return;

      const channels = await this.botRequest<DiscordChannel[]>(`/guilds/${workspace.guildId}/channels`);
      const category = channels.find(
        (c) =>
          c.type === DISCORD_CATEGORY_CHANNEL &&
          c.name === `TASKS DASH - ${project.key.toUpperCase()}`,
      );
      if (!category) return;

      const overwrites: any[] = [
        {
          id: workspace.guildId,
          type: 0, // role
          allow: "0",
          deny: "1024", // deny VIEW_CHANNEL for @everyone
        },
      ];

      for (const member of members) {
        const isParticipant = project.memberIds?.includes(String(member._id));
        const isOwner = member.role === MEMBER_ROLES.owner;

        if ((isParticipant || isOwner) && member.discordUsername) {
          const discordUserId = await this.findGuildMemberId(workspace.guildId, member.discordUsername);
          if (discordUserId) {
            overwrites.push({
              id: discordUserId,
              type: 1, // member
              allow: "1024", // allow VIEW_CHANNEL
              deny: "0",
            });
          }
        }
      }

      await this.botRequest(`/channels/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          permission_overwrites: overwrites,
        }),
      });
    } catch (e) {
      console.error(`Failed to sync project permissions for ${integration.projectKey}:`, e);
    }
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
    if (!response.ok)
      throw new UnauthorizedException("Discord rejected the webhook URL.");
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
    const workspaceConfigured = await this.workspaces.exists({
      workspaceId,
      enabled: true,
    });
    if (workspaceConfigured)
      return this.provisionProject(workspaceId, integration.projectKey, {});
    await this.events.emitAsync(DISCORD_PROJECT_PROVISIONED_EVENT, {
      workspaceId,
      projectKey: integration.projectKey,
      guildId: integration.guildId ?? "manual",
      channelId: integration.channelId,
    } satisfies DiscordProjectProvisionedEvent);
    return this.statusOf(integration);
  }

  async list(workspaceId: string): Promise<Record<string, unknown>[]> {
    const integrations = await this.integrations
      .find({ workspaceId })
      .sort({ projectKey: 1 })
      .exec();

    const validProjects = await this.projects.list(workspaceId);
    const validProjectKeys = new Set(validProjects.map((p) => p.key.toUpperCase()));

    const activeIntegrations: DiscordIntegrationHydratedDocument[] = [];
    for (const item of integrations) {
      if (validProjectKeys.has(item.projectKey.toUpperCase())) {
        activeIntegrations.push(item);
      } else {
        await this.integrations.deleteOne({ _id: item._id }).exec();
      }
    }

    return activeIntegrations.map((item) => this.statusOf(item));
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
    channelTypeOrId?: string,
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

    let targetChannelId: string | undefined;
    if (channelTypeOrId) {
      if (/^\d{17,20}$/.test(channelTypeOrId)) {
        targetChannelId = channelTypeOrId;
      } else if (channelTypeOrId === "deployment") {
        targetChannelId = integration.deploymentChannelId;
      } else if (channelTypeOrId === "docs") {
        targetChannelId = integration.docsChannelId;
      } else if (channelTypeOrId === "general") {
        targetChannelId = integration.generalChannelId;
      } else if (channelTypeOrId === "designer") {
        targetChannelId = integration.designerChannelId;
      } else if (channelTypeOrId === "members") {
        targetChannelId = integration.membersChannelId;
      } else if (channelTypeOrId === "reports") {
        targetChannelId = integration.reportsChannelId;
      } else if (channelTypeOrId === "meeting") {
        targetChannelId = integration.meetingChannelId;
      } else if (channelTypeOrId === "updates") {
        targetChannelId = integration.channelId;
      }
    }

    if (targetChannelId && targetChannelId !== integration.channelId) {
      await this.sendToChannel(targetChannelId, { title, description });
      await this.integrations
        .updateOne(
          { _id: integration._id },
          { $set: { lastSuccessAt: new Date() }, $unset: { lastError: 1 } },
        )
        .exec();
      return;
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
          Math.min(Math.max(Number(rate.retry_after ?? 1) * 1000, 250), 5000),
        ),
      );
      response = await request();
    }
    if (!response.ok) {
      const error = `Discord webhook failed with HTTP ${response.status}.`;
      await this.integrations
        .updateOne({ _id: integration._id }, { $set: { lastError: error } })
        .exec();
      throw new ServiceUnavailableException(error);
    }
    await this.integrations
      .updateOne(
        { _id: integration._id },
        { $set: { lastSuccessAt: new Date() }, $unset: { lastError: 1 } },
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
      docsChannelId: item.docsChannelId ?? null,
      docsChannelName: item.docsChannelName ?? null,
      generalChannelId: item.generalChannelId ?? null,
      generalChannelName: item.generalChannelName ?? null,
      deploymentChannelId: item.deploymentChannelId ?? null,
      deploymentChannelName: item.deploymentChannelName ?? null,
      designerChannelId: item.designerChannelId ?? null,
      designerChannelName: item.designerChannelName ?? null,
      membersChannelId: item.membersChannelId ?? null,
      membersChannelName: item.membersChannelName ?? null,
      reportsChannelId: item.reportsChannelId ?? null,
      reportsChannelName: item.reportsChannelName ?? null,
      meetingChannelId: item.meetingChannelId ?? null,
      meetingChannelName: item.meetingChannelName ?? null,
      guildId: item.guildId ?? null,
      provisionedBy: item.provisionedBy,
      provisionedAt: item.provisionedAt ?? null,
      enabled: item.enabled,
      connected: true,
      lastSuccessAt: item.lastSuccessAt ?? null,
      lastError: item.lastError ?? null,
    };
  }

  /** Send a message embed directly to any Discord channel via bot (not webhook) */
  async sendToChannel(
    channelId: string,
    embed: {
      title: string;
      description: string;
      color?: number;
      url?: string;
      fields?: Array<{ name: string; value: string; inline?: boolean }>;
    },
  ): Promise<string> {
    const message = await this.botRequest<{ id: string }>(
      `/channels/${channelId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          embeds: [
            {
              title: embed.title.slice(0, 256),
              description: embed.description.slice(0, 4096),
              color: embed.color ?? 0x5865f2,
              url: embed.url,
              fields: embed.fields ?? [],
            },
          ],
          allowed_mentions: { parse: [] },
        }),
      },
    );
    return message.id;
  }

  /** Reply to an existing Discord message (thread reply) in a channel */
  async sendThreadReply(
    channelId: string,
    parentMessageId: string,
    embed: { title: string; description: string; color?: number; url?: string },
  ): Promise<string> {
    const message = await this.botRequest<{ id: string }>(
      `/channels/${channelId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          message_reference: {
            message_id: parentMessageId,
            fail_if_not_exists: false,
          },
          embeds: [
            {
              title: embed.title.slice(0, 256),
              description: embed.description.slice(0, 4096),
              color: embed.color ?? 0x5865f2,
              url: embed.url,
            },
          ],
          allowed_mentions: { parse: [] },
        }),
      },
    );
    return message.id;
  }

  /** Delete a Discord message in a channel by bot */
  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    const response = await fetch(
      `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bot ${this.config.getOrThrow<string>("DISCORD_BOT_TOKEN")}`,
          "user-agent": "Tasks-Dash/1.0",
        },
      },
    );
    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException(
        `Discord message deletion failed with HTTP ${response.status}.`,
      );
    }
  }

  /** Get Discord integration record for a project */
  async getProjectIntegration(
    workspaceId: string,
    projectKey: string,
  ): Promise<DiscordIntegrationDocument | null> {
    return this.integrations
      .findOne({
        workspaceId,
        projectKey: projectKey.toUpperCase(),
        enabled: true,
      })
      .exec();
  }

  /** Get all available text channels dynamically for a project from Discord server */
  async getProjectChannels(
    workspaceId: string,
    projectKey: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const pKeyLower = projectKey.toLowerCase();
    const integration = await this.integrations
      .findOne({
        workspaceId,
        projectKey: projectKey.toUpperCase(),
      })
      .exec();

    const workspace = await this.workspaces.findOne({ workspaceId }).exec();
    const guildId = integration?.guildId ?? workspace?.guildId;

    if (guildId && this.config.get<string>("DISCORD_BOT_TOKEN")) {
      try {
        const channels = await this.botRequest<DiscordChannel[]>(
          `/guilds/${guildId}/channels`,
        );
        const textChannels = channels.filter(
          (channel) => channel.type === DISCORD_TEXT_CHANNEL,
        );

        // Sort channels matching the project key prefix (e.g. lcsp-updates) to the top!
        textChannels.sort((a, b) => {
          const aMatch = a.name.toLowerCase().startsWith(pKeyLower) ? 0 : 1;
          const bMatch = b.name.toLowerCase().startsWith(pKeyLower) ? 0 : 1;
          if (aMatch !== bMatch) return aMatch - bMatch;
          return a.name.localeCompare(b.name);
        });

        if (textChannels.length > 0) {
          return textChannels.map((channel) => ({
            id: channel.id,
            name: `#${channel.name}`,
          }));
        }
      } catch {
        /* Fallback to stored channels */
      }
    }

    if (!integration) return [];

    const result: Array<{ id: string; name: string }> = [];
    if (integration.channelId) {
      result.push({
        id: integration.channelId,
        name: integration.channelName
          ? `#${integration.channelName}`
          : "#updates",
      });
    }
    if (integration.deploymentChannelId) {
      result.push({
        id: integration.deploymentChannelId,
        name: integration.deploymentChannelName
          ? `#${integration.deploymentChannelName}`
          : "#deployment",
      });
    }
    if (integration.docsChannelId) {
      result.push({
        id: integration.docsChannelId,
        name: integration.docsChannelName
          ? `#${integration.docsChannelName}`
          : "#docs",
      });
    }
    if (integration.generalChannelId) {
      result.push({
        id: integration.generalChannelId,
        name: integration.generalChannelName
          ? `#${integration.generalChannelName}`
          : "#general",
      });
    }
    if (integration.designerChannelId) {
      result.push({
        id: integration.designerChannelId,
        name: integration.designerChannelName
          ? `#${integration.designerChannelName}`
          : "#designer",
      });
    }
    if (integration.membersChannelId) {
      result.push({
        id: integration.membersChannelId,
        name: integration.membersChannelName
          ? `#${integration.membersChannelName}`
          : "#members",
      });
    }
    if (integration.reportsChannelId) {
      result.push({
        id: integration.reportsChannelId,
        name: integration.reportsChannelName
          ? `#${integration.reportsChannelName}`
          : "#reports",
      });
    }
    return result;
  }

  /** Delete all provisioned channels and category in the connected Discord server */
  async cleanGuildChannels(
    workspaceId: string,
  ): Promise<{ deletedChannelsCount: number; deletedCategoriesCount: number }> {
    const workspace = await this.workspaces.findOne({ workspaceId }).exec();
    if (!workspace?.guildId) {
      throw new BadRequestException(
        "Workspace is not connected to any Discord server.",
      );
    }
    const guildId = workspace.guildId;
    const integrations = await this.integrations.find({ workspaceId }).exec();

    const knownChannelIds = new Set<string>();
    for (const item of integrations) {
      if (item.channelId) knownChannelIds.add(item.channelId);
      if (item.deploymentChannelId)
        knownChannelIds.add(item.deploymentChannelId);
      if (item.docsChannelId) knownChannelIds.add(item.docsChannelId);
      if (item.generalChannelId) knownChannelIds.add(item.generalChannelId);
      if (item.designerChannelId) knownChannelIds.add(item.designerChannelId);
      if (item.membersChannelId) knownChannelIds.add(item.membersChannelId);
      if (item.reportsChannelId) knownChannelIds.add(item.reportsChannelId);
      if (item.meetingChannelId) knownChannelIds.add(item.meetingChannelId);
    }
    if (workspace.categoryId) knownChannelIds.add(workspace.categoryId);

    let discordChannels: DiscordChannel[] = [];
    try {
      discordChannels = await this.botRequest<DiscordChannel[]>(
        `/guilds/${guildId}/channels`,
      );
    } catch {
      /* ignore */
    }

    let deletedChannelsCount = 0;
    let deletedCategoriesCount = 0;

    for (const channel of discordChannels) {
      const isKnown = knownChannelIds.has(channel.id);
      const isUnderCategory =
        Boolean(workspace.categoryId) &&
        channel.parent_id === workspace.categoryId;

      if (isKnown || isUnderCategory) {
        try {
          await this.botRequest(
            `/channels/${channel.id}`,
            { method: "DELETE" },
            `Tasks Dash workspace ${workspaceId} channel deletion`,
          );
          if (channel.type === DISCORD_CATEGORY_CHANNEL) {
            deletedCategoriesCount++;
          } else {
            deletedChannelsCount++;
          }
        } catch {
          /* ignore individual deletion failure */
        }
      }
    }

    // Unset all stored channel fields in DB
    await this.integrations.updateMany(
      { workspaceId },
      {
        $unset: {
          channelId: 1,
          channelName: 1,
          deploymentChannelId: 1,
          deploymentChannelName: 1,
          docsChannelId: 1,
          docsChannelName: 1,
          generalChannelId: 1,
          generalChannelName: 1,
          designerChannelId: 1,
          designerChannelName: 1,
          membersChannelId: 1,
          membersChannelName: 1,
          reportsChannelId: 1,
          reportsChannelName: 1,
          meetingChannelId: 1,
          meetingChannelName: 1,
        },
      },
    );

    if (workspace.categoryId) {
      workspace.categoryId = undefined;
      workspace.categoryName = undefined;
      await workspace.save();
    }

    return { deletedChannelsCount, deletedCategoriesCount };
  }

  /** Delete all channels associated with a specific project Key in the Discord server */
  async deleteProjectChannels(
    workspaceId: string,
    projectKey: string,
  ): Promise<{ deletedChannelsCount: number }> {
    const workspace = await this.workspaces.findOne({ workspaceId }).exec();
    if (!workspace?.guildId) return { deletedChannelsCount: 0 };
    const integration = await this.integrations
      .findOne({ workspaceId, projectKey: projectKey.toUpperCase() })
      .exec();
    if (!integration) return { deletedChannelsCount: 0 };

    const channelIdsToDelete = new Set<string>();
    if (integration.channelId) channelIdsToDelete.add(integration.channelId);
    if (integration.deploymentChannelId) channelIdsToDelete.add(integration.deploymentChannelId);
    if (integration.docsChannelId) channelIdsToDelete.add(integration.docsChannelId);
    if (integration.generalChannelId) channelIdsToDelete.add(integration.generalChannelId);
    if (integration.designerChannelId) channelIdsToDelete.add(integration.designerChannelId);
    if (integration.membersChannelId) channelIdsToDelete.add(integration.membersChannelId);
    if (integration.reportsChannelId) channelIdsToDelete.add(integration.reportsChannelId);
    if (integration.meetingChannelId) channelIdsToDelete.add(integration.meetingChannelId);

    let deletedChannelsCount = 0;
    for (const channelId of channelIdsToDelete) {
      try {
        await this.botRequest(
          `/channels/${channelId}`,
          { method: "DELETE" },
          `Tasks Dash project ${projectKey} deletion cleanup`,
        );
        deletedChannelsCount++;
      } catch {
        /* ignore individual deletion failure */
      }
    }

    await this.integrations.deleteOne({ workspaceId, projectKey: projectKey.toUpperCase() }).exec();
    return { deletedChannelsCount };
  }

  async findGuildMemberId(guildId: string, username: string): Promise<string | null> {
    try {
      const response = await this.botRequest<Array<{ user: { id: string; username: string } }>>(
        `/guilds/${guildId}/members/search?query=${encodeURIComponent(username)}`,
      );
      if (response && response.length > 0) {
        const match = response.find(m => m.user.username.toLowerCase() === username.toLowerCase()) || response[0];
        return match.user.id;
      }
    } catch (e) {
      console.error(`Failed to find guild member for ${username}:`, e);
    }
    return null;
  }

  async getOrCreatePrChannel(workspaceId: string, projectKey: string): Promise<string | null> {
    const workspace = await this.workspaces.findOne({ workspaceId, enabled: true }).exec();
    if (!workspace) return null;
    const integration = await this.integrations.findOne({ workspaceId, projectKey: projectKey.toUpperCase() }).exec();
    const guildId = workspace.guildId;
    
    try {
      const channels = await this.botRequest<DiscordChannel[]>(`/guilds/${guildId}/channels`);
      const prChannelName = `${projectKey.toLowerCase()}-pr`;
      
      const existing = channels.find(
        (c) => c.type === DISCORD_TEXT_CHANNEL && c.name.toLowerCase() === prChannelName,
      );
      if (existing) return existing.id;
      
      let parentId = workspace.categoryId ?? null;
      if (!parentId && integration?.channelId) {
        const updatesChan = channels.find(c => c.id === integration.channelId);
        if (updatesChan?.parent_id) parentId = updatesChan.parent_id;
      }
      
      const created = await this.botRequest<DiscordChannel>(
        `/guilds/${guildId}/channels`,
        {
          method: "POST",
          body: JSON.stringify({
            name: prChannelName,
            type: DISCORD_TEXT_CHANNEL,
            topic: `Dedicated PR updates for project ${projectKey.toUpperCase()}`,
            parent_id: parentId,
          }),
        },
        `Tasks Dash PR channel provisioning for ${projectKey}`,
      );
      return created.id;
    } catch (e) {
      console.error("Failed to get/create PR channel in Discord:", e);
      return integration?.channelId ?? null;
    }
  }
}
