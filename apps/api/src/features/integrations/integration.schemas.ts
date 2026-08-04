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
export const GithubInstallationSchema = SchemaFactory.createForClass(
  GithubInstallationDocument,
);
GithubInstallationSchema.index(
  { workspaceId: 1, installationId: 1 },
  { unique: true },
);

@Schema({ collection: "discord_integrations", timestamps: true })
export class DiscordIntegrationDocument extends BaseMongoDocument {
  @Prop({ required: true, uppercase: true, trim: true }) projectKey!: string;
  @Prop({ required: true }) encryptedWebhookUrl!: string;
  @Prop({ required: true }) webhookName!: string;
  @Prop({ required: true }) channelId!: string;
  @Prop({ default: true }) enabled!: boolean;
  @Prop() lastSuccessAt?: Date;
  @Prop() lastError?: string;
}
export const DiscordIntegrationSchema = SchemaFactory.createForClass(
  DiscordIntegrationDocument,
);
DiscordIntegrationSchema.index(
  { workspaceId: 1, projectKey: 1 },
  { unique: true },
);

@Schema({ collection: "google_drive_integrations", timestamps: true })
export class GoogleDriveIntegrationDocument extends BaseMongoDocument {
  @Prop({ required: true }) encryptedRefreshToken!: string;
  @Prop({ required: true, lowercase: true, trim: true }) accountEmail!: string;
  @Prop({ required: true }) connectedByMemberId!: string;
  @Prop({ required: true }) workspaceRootFolderId!: string;
  @Prop({ required: true }) workspaceRootFolderName!: string;
  @Prop({ required: true }) scope!: string;
  @Prop({ required: true }) connectedAt!: Date;
  @Prop() synchronizedAt?: Date;
  @Prop() lastError?: string;
}
export const GoogleDriveIntegrationSchema = SchemaFactory.createForClass(
  GoogleDriveIntegrationDocument,
);
GoogleDriveIntegrationSchema.index({ workspaceId: 1 }, { unique: true });

@Schema({ collection: "integration_oauth_states", timestamps: true })
export class IntegrationOauthStateDocument {
  @Prop({ required: true, unique: true, index: true }) state!: string;
  @Prop({ required: true }) workspaceId!: string;
  @Prop() memberId?: string;
  @Prop() provider?: string;
  @Prop({ required: true, expires: 0 }) expiresAt!: Date;
}
export const IntegrationOauthStateSchema = SchemaFactory.createForClass(
  IntegrationOauthStateDocument,
);

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
export const GithubWebhookDeliverySchema = SchemaFactory.createForClass(
  GithubWebhookDeliveryDocument,
);

export class LinkGithubRepositoryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  repositoryId!: number;
}

export class CreateDriveFolderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;

  @IsString()
  @MaxLength(256)
  @IsOptional()
  parentId?: string;
}

export class RenameDriveItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  name!: string;
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

export type GithubInstallationHydratedDocument =
  HydratedDocument<GithubInstallationDocument>;
export type DiscordIntegrationHydratedDocument =
  HydratedDocument<DiscordIntegrationDocument>;
export type GoogleDriveIntegrationHydratedDocument =
  HydratedDocument<GoogleDriveIntegrationDocument>;
export type IntegrationOauthStateHydratedDocument =
  HydratedDocument<IntegrationOauthStateDocument>;
export type GithubWebhookDeliveryHydratedDocument =
  HydratedDocument<GithubWebhookDeliveryDocument>;
