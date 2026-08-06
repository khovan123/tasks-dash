import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MembersModule } from "../members/members.module";
import { ProjectsModule } from "../projects/projects.module";
import { WorkItemsModule } from "../work-items/work-items.module";
import { MemberDocument, MemberSchema } from "../members/member.schema";
import { DiscordAdapter } from "./discord.adapter";
import { DiscordDefaultAutomationsService } from "./discord-default-automations.service";
import { DiscordProjectLogService } from "./discord-project-log.service";
import { GithubAppService, IntegrationStateService } from "./github-app.service";
import { GithubWebhookService } from "./github-webhook.service";
import { IntegrationsController } from "./integrations.controller";
import {
  DesignCatalogItemLogDocument,
  DesignCatalogItemLogSchema,
  DiscordIntegrationDocument,
  DiscordIntegrationSchema,
  DiscordWorkspaceDocument,
  DiscordWorkspaceSchema,
  GithubInstallationDocument,
  GithubInstallationSchema,
  GithubPullRequestLogDocument,
  GithubPullRequestLogSchema,
  GithubWebhookDeliveryDocument,
  GithubWebhookDeliverySchema,
  IntegrationOauthStateDocument,
  IntegrationOauthStateSchema,
  TaskDiscordLogDocument,
  TaskDiscordLogSchema,
} from "./integration.schemas";
import { forwardRef } from "@nestjs/common";

@Module({
  imports: [
    MembersModule,
    ProjectsModule,
    forwardRef(() => WorkItemsModule),
    MongooseModule.forFeature([
      { name: GithubInstallationDocument.name, schema: GithubInstallationSchema },
      { name: DiscordWorkspaceDocument.name, schema: DiscordWorkspaceSchema },
      { name: DiscordIntegrationDocument.name, schema: DiscordIntegrationSchema },
      { name: IntegrationOauthStateDocument.name, schema: IntegrationOauthStateSchema },
      { name: GithubWebhookDeliveryDocument.name, schema: GithubWebhookDeliverySchema },
      { name: GithubPullRequestLogDocument.name, schema: GithubPullRequestLogSchema },
      { name: DesignCatalogItemLogDocument.name, schema: DesignCatalogItemLogSchema },
      { name: TaskDiscordLogDocument.name, schema: TaskDiscordLogSchema },
      { name: MemberDocument.name, schema: MemberSchema },
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationStateService,
    DiscordAdapter,
    DiscordDefaultAutomationsService,
    DiscordProjectLogService,
    GithubAppService,
    GithubWebhookService,
  ],
  exports: [DiscordAdapter, DiscordProjectLogService, GithubAppService],
})
export class IntegrationsModule {}
