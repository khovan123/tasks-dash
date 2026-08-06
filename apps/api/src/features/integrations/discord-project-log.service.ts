import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { MemberDocument, MemberHydratedDocument } from "../members/member.schema";
import { DiscordAdapter } from "./discord.adapter";
import { DiscordIntegrationDocument, DiscordIntegrationHydratedDocument } from "./integration.schemas";

/**
 * Manages per-project Discord channel logging:
 * - #<key>-members: push updated member directory when members join/leave
 * - #<key>-reports: daily cron that posts completed tasks
 */
@Injectable()
export class DiscordProjectLogService {
  private readonly logger = new Logger(DiscordProjectLogService.name);

  constructor(
    private readonly discord: DiscordAdapter,
    @InjectModel(DiscordIntegrationDocument.name)
    private readonly integrations: Model<DiscordIntegrationHydratedDocument>,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberHydratedDocument>,
  ) {}

  @OnEvent("workspace.members.changed", { async: true })
  async syncMembersDirectory({ workspaceId }: { workspaceId: string }): Promise<void> {
    try {
      await this.discord.syncMemberRolesAndPermissions(workspaceId);
    } catch (e) {
      this.logger.warn(`Failed to sync Discord roles/permissions: ${String(e)}`);
    }

    const projectIntegrations = await this.integrations
      .find({ workspaceId, enabled: true })
      .exec();
    if (!projectIntegrations.length) return;

    const allMembers = await this.members
      .find({ workspaceId })
      .select({ name: 1, email: 1, role: 1, avatarUrl: 1, githubLogin: 1, discordUsername: 1 })
      .sort({ role: 1, name: 1 })
      .lean()
      .exec();

    for (const integration of projectIntegrations) {
      if (!integration.membersChannelId) continue;
      try {
        const lines = allMembers.map((m) => {
          const github = m.githubLogin ? `GitHub: @${m.githubLogin}` : "";
          const discord = m.discordUsername ? `Discord: @${m.discordUsername}` : "";
          const identity = [github, discord].filter(Boolean).join(" · ");
          const roleEmoji = m.role === MEMBER_ROLES.owner ? ":crown:" : m.role === MEMBER_ROLES.designer ? ":paintbrush:" : m.role === MEMBER_ROLES.dev ? ":keyboard:" : ":bust_in_silhouette:";
          return `${roleEmoji} **${m.name}** (${m.role})${identity ? `\n　${identity}` : ""}`;
        });

        const description = lines.join("\n\n") || "_No members yet._";
        await this.discord.sendToChannel(integration.membersChannelId, {
          title: `:busts_in_silhouette: Project Members — ${integration.projectKey}`,
          description: description.slice(0, 4000),
          color: 0x5865f2,
        });
      } catch (err) {
        this.logger.warn(
          `Could not sync members directory for project ${integration.projectKey}: ${String(err)}`,
        );
      }
    }
  }

  @OnEvent("project.members.updated", { async: true })
  async handleProjectMembersUpdated({
    workspaceId,
    projectKey,
  }: {
    workspaceId: string;
    projectKey: string;
  }): Promise<void> {
    try {
      await this.discord.syncProjectPermissions(workspaceId, projectKey);
    } catch (e) {
      this.logger.warn(`Failed to sync Discord project permissions: ${String(e)}`);
    }
  }

  /**
   * Daily cron: post a summary of today's completed tasks to #<key>-reports.
   * Extend this with actual work-item queries once the work-items service
   * exposes a "completed today" method.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9PM, { name: "discord-daily-reports" })
  async sendDailyReports(): Promise<void> {
    const integrations = await this.integrations
      .find({ enabled: true })
      .exec();

    for (const integration of integrations) {
      if (!integration.reportsChannelId) continue;
      try {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);
        // Placeholder: extend by injecting WorkItemsService to list completed items
        const description = [
          `:clipboard: **Daily Report — ${dateStr}**`,
          "",
          `_No completed tasks data available yet. Extend \`DiscordProjectLogService.sendDailyReports\` with WorkItemsService._`,
        ].join("\n");

        await this.discord.sendToChannel(integration.reportsChannelId, {
          title: `:bar_chart: Daily Report — ${integration.projectKey}`,
          description,
          color: 0x0ea5e9,
        });
      } catch (err) {
        this.logger.warn(
          `Could not send daily report for project ${integration.projectKey}: ${String(err)}`,
        );
      }
    }
  }
}
