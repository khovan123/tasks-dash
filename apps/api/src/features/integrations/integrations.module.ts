import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MembersModule } from "../members/members.module";
import { ProjectsModule } from "../projects/projects.module";
import { WorkItemsModule } from "../work-items/work-items.module";
import { DiscordAdapter } from "./discord.adapter";
import { DiscordDefaultAutomationsService } from "./discord-default-automations.service";
import { GithubAppService, IntegrationStateService } from "./github-app.service";
import { GithubWebhookService } from "./github-webhook.service";
import { IntegrationsController } from "./integrations.controller";
import {
  DiscordIntegrationDocument,
  DiscordIntegrationSchema,
  DiscordWorkspaceDocument,
  DiscordWorkspaceSchema,
  GithubInstallationDocument,
  GithubInstallationSchema,
  GithubWebhookDeliveryDocument,
  GithubWebhookDeliverySchema,
  IntegrationOauthStateDocument,
  IntegrationOauthStateSchema,
} from "./integration.schemas";

@Module({
  imports: [
    MembersModule,
    ProjectsModule,
    WorkItemsModule,
    MongooseModule.forFeature([
      { name: GithubInstallationDocument.name, schema: GithubInstallationSchema },
      { name: DiscordWorkspaceDocument.name, schema: DiscordWorkspaceSchema },
      { name: DiscordIntegrationDocument.name, schema: DiscordIntegrationSchema },
      { name: IntegrationOauthStateDocument.name, schema: IntegrationOauthStateSchema },
      { name: GithubWebhookDeliveryDocument.name, schema: GithubWebhookDeliverySchema },
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationStateService,
    DiscordAdapter,
    DiscordDefaultAutomationsService,
    GithubAppService,
    GithubWebhookService,
  ],
  exports: [DiscordAdapter, GithubAppService],
})
export class IntegrationsModule {}
