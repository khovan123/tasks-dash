import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProjectsModule } from "../projects/projects.module";
import { WorkItemsModule } from "../work-items/work-items.module";
import { DiscordAdapter } from "./discord.adapter";
import { GithubAppService, IntegrationStateService } from "./github-app.service";
import { GithubWebhookService } from "./github-webhook.service";
import { GoogleDriveAdapter } from "./google-drive.adapter";
import { IntegrationsController } from "./integrations.controller";
import {
  DiscordIntegrationDocument, DiscordIntegrationSchema,
  GithubInstallationDocument, GithubInstallationSchema,
  GithubWebhookDeliveryDocument, GithubWebhookDeliverySchema,
  GoogleDriveIntegrationDocument, GoogleDriveIntegrationSchema,
  IntegrationOauthStateDocument, IntegrationOauthStateSchema,
} from "./integration.schemas";

@Module({
  imports: [
    ProjectsModule,
    WorkItemsModule,
    MongooseModule.forFeature([
      { name: GithubInstallationDocument.name, schema: GithubInstallationSchema },
      { name: DiscordIntegrationDocument.name, schema: DiscordIntegrationSchema },
      { name: GoogleDriveIntegrationDocument.name, schema: GoogleDriveIntegrationSchema },
      { name: IntegrationOauthStateDocument.name, schema: IntegrationOauthStateSchema },
      { name: GithubWebhookDeliveryDocument.name, schema: GithubWebhookDeliverySchema },
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationStateService, DiscordAdapter, GithubAppService, GoogleDriveAdapter, GithubWebhookService],
  exports: [DiscordAdapter, GithubAppService, GoogleDriveAdapter],
})
export class IntegrationsModule {}
