import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import {
  MemberDocument,
  MemberHydratedDocument,
} from "../members/member.schema";
import { ProjectsService } from "../projects/projects.service";
import { DiscordAdapter } from "./discord.adapter";
import { GithubAppService } from "./github-app.service";
import {
  DiscordIntegrationDocument,
  DiscordIntegrationHydratedDocument,
  DiscordWorkspaceDocument,
  DiscordWorkspaceHydratedDocument,
} from "./integration.schemas";

interface DiscordBotRequest {
  botRequest<T>(
    path: string,
    init?: RequestInit,
    auditReason?: string,
  ): Promise<T>;
}

/**
 * DiscordAdapter historically treated a Discord message snowflake as if it
 * were a thread channel ID. No thread is created by the application, so that
 * request always resolves to Discord error 10003 (Unknown Channel) before
 * falling back to a normal message reply.
 *
 * Keep the public DiscordAdapter contract for existing consumers, but make
 * sendThreadReply use Discord's inline message_reference directly.
 */
@Injectable()
export class DiscordInlineReplyAdapter extends DiscordAdapter {
  constructor(
    @InjectModel(DiscordWorkspaceDocument.name)
    workspaces: Model<DiscordWorkspaceHydratedDocument>,
    @InjectModel(DiscordIntegrationDocument.name)
    integrations: Model<DiscordIntegrationHydratedDocument>,
    @InjectModel(MemberDocument.name)
    members: Model<MemberHydratedDocument>,
    encryption: CredentialEncryptionService,
    projects: ProjectsService,
    config: ConfigService,
    events: EventEmitter2,
    @Inject(forwardRef(() => GithubAppService)) githubApp: GithubAppService,
  ) {
    super(
      workspaces,
      integrations,
      members,
      encryption,
      projects,
      config,
      events,
      githubApp,
    );
  }

  override async sendThreadReply(
    channelId: string,
    parentMessageId: string,
    embed: {
      title: string;
      description: string;
      color?: number;
      url?: string;
    },
    mention?: string | null,
  ): Promise<string> {
    // botRequest is private in the base adapter only to keep the transport
    // internal. This override intentionally reuses that transport so rate
    // limiting/error normalization remains identical to every Discord call.
    const botRequest = (
      this as unknown as DiscordBotRequest
    ).botRequest.bind(this);

    const ids = mention ? mention.match(/\d{17,21}/g) || [] : [];
    const uniqueIds = Array.from(new Set(ids));
    const message = await botRequest<{ id: string }>(
      `/channels/${channelId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          ...(mention ? { content: mention } : {}),
          message_reference: {
            message_id: parentMessageId,
            channel_id: channelId,
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
          allowed_mentions:
            uniqueIds.length > 0
              ? { parse: [], users: uniqueIds }
              : { parse: [] },
        }),
      },
    );

    return message.id;
  }
}
