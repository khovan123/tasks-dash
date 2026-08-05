import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { BaseMongoDocument } from "../../common/base.schema";

@Schema({ collection: "github_installations", timestamps: true })
export class GithubInstallationDocument extends BaseMongoDocument {
  @Prop({ required: true, unique: true, index: true }) installationId!: number;
  @Prop({ required: true }) accountLogin!: string;
  @Prop({ required: true }) accountType!: string;
  @Prop({ required: true }) repositorySelection!: string;
  @Prop({ type: [String], default: [] }) repositoryFullNames!: string[];
  @Prop({ default: false }) suspended!: boolean;
  @Prop() synchronizedAt?: Date;
}
export const GithubInstallationSchema = SchemaFactory.createForClass(GithubInstallationDocument);
GithubInstallationSchema.index({ workspaceId: 1, installationId: 1 }, { unique: true });

@Schema({ collection: "discord_workspace_integrations", timestamps: true })
export class DiscordWorkspaceDocument extends BaseMongoDocument {
  @Prop({ required: true, trim: true }) guildId!: string;
  @Prop({ required: true, trim: true }) guildName!: string;
  @Prop({ trim: true }) categoryId?: string;
  @Prop({ trim: true }) categoryName?: string;
  @Prop({ required: true, default: "{{projectKey}}-updates" })
  channelNameTemplate!: string;
  @Prop({ required: true, default: "{{projectKey}}-docs" })
  docsChannelNameTemplate!: string;
  @Prop({ default: true }) enabled!: boolean;
  @Prop({ required: true }) configuredAt!: Date;
  @Prop() lastProvisionedAt?: Date;
  @Prop() lastError?: string;
}
export const DiscordWorkspaceSchema = SchemaFactory.createForClass(DiscordWorkspaceDocument);
DiscordWorkspaceSchema.index({ workspaceId: 1 }, { unique: true });
DiscordWorkspaceSchema.index({ guildId: 1 });

@Schema({ collection: "discord_integrations", timestamps: true })
export class DiscordIntegrationDocument extends BaseMongoDocument {
  @Prop({ required: true, uppercase: true, trim: true }) projectKey!: string;
  @Prop({ required: true }) encryptedWebhookUrl!: string;
  @Prop({ required: true }) webhookName!: string;
  @Prop({ trim: true }) webhookId?: string;
  @Prop({ required: true }) channelId!: string;
  @Prop({ trim: true }) channelName?: string;
  @Prop({ trim: true }) docsChannelId?: string;
  @Prop({ trim: true }) docsChannelName?: string;
  @Prop({ trim: true }) guildId?: string;
  @Prop({ enum: ["BOT", "MANUAL"], default: "MANUAL" })
  provisionedBy!: "BOT" | "MANUAL";
  @Prop({ default: true }) enabled!: boolean;
  @Prop() provisionedAt?: Date;
  @Prop() lastSuccessAt?: Date;
  @Prop() lastError?: string;
}
export const DiscordIntegrationSchema = SchemaFactory.createForClass(DiscordIntegrationDocument);
DiscordIntegrationSchema.index({ workspaceId: 1, projectKey: 1 }, { unique: true });
DiscordIntegrationSchema.index({ workspaceId: 1, channelId: 1 });
DiscordIntegrationSchema.index(
  { workspaceId: 1, docsChannelId: 1 },
  { unique: true, partialFilterExpression: { docsChannelId: { $type: "string" } } },
);

@Schema({ collection: "integration_oauth_states", timestamps: true })
export class IntegrationOauthStateDocument {
  @Prop({ required: true, unique: true, index: true }) state!: string;
  @Prop({ required: true }) workspaceId!: string;
  @Prop() memberId?: string;
  @Prop() provider?: string;
  @Prop({ required: true, expires: 0 }) expiresAt!: Date;
}
export const IntegrationOauthStateSchema = SchemaFactory.createForClass(IntegrationOauthStateDocument);

@Schema({ collection: "github_webhook_deliveries", timestamps: true })
export class GithubWebhookDeliveryDocument {
  @Prop({ required: true, unique: true, index: true }) deliveryId!: string;
  @Prop({ required: true }) event!: string;
  @Prop({ required: true }) receivedAt!: Date;
  @Prop() processingAt?: Date;
  @Prop() processedAt?: Date;
  @Prop() failedAt?: Date;
  @Prop() lastError?: string;
}
export const GithubWebhookDeliverySchema = SchemaFactory.createForClass(GithubWebhookDeliveryDocument);

export class LinkGithubRepositoryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  repositoryId!: number;
}

export class ConfigureDiscordWorkspaceDto {
  @IsString()
  @Matches(/^\d{17,20}$/)
  guildId!: string;

  @IsString()
  @Matches(/^\d{17,20}$/)
  @IsOptional()
  categoryId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  channelNameTemplate?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  docsChannelNameTemplate?: string;
}

export class ProvisionDiscordProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  channelName?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  docsChannelName?: string;

  @IsString()
  @MaxLength(1024)
  @IsOptional()
  topic?: string;
}

export class ConnectDiscordDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9]{1,9}$/)
  projectKey!: string;

  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  webhookUrl!: string;
}

export class DiscordMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description!: string;
}

export type GithubInstallationHydratedDocument = HydratedDocument<GithubInstallationDocument>;
export type DiscordWorkspaceHydratedDocument = HydratedDocument<DiscordWorkspaceDocument>;
export type DiscordIntegrationHydratedDocument = HydratedDocument<DiscordIntegrationDocument>;
export type IntegrationOauthStateHydratedDocument = HydratedDocument<IntegrationOauthStateDocument>;
export type GithubWebhookDeliveryHydratedDocument = HydratedDocument<GithubWebhookDeliveryDocument>;
