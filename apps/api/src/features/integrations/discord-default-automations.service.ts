import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_EXECUTION_MODES,
  AUTOMATION_TRIGGERS,
} from "@tasks-dash/contracts";
import {
  DISCORD_PROJECT_PROVISIONED_EVENT,
  DiscordProjectProvisionedEvent,
} from "./discord.adapter";

interface DefaultRule {
  name: string;
  trigger: string;
  title: string;
  message: string;
}

const DEFAULT_RULES: DefaultRule[] = [
  {
    name: "Discord · Pull request opened",
    trigger: AUTOMATION_TRIGGERS.pullRequestOpened,
    title: "{{workItemKey}} · PR #{{pullRequestNumber}} opened",
    message:
      "{{repositoryFullName}}\n{{title}}\n{{pullRequestUrl}}",
  },
  {
    name: "Discord · Pull request merged",
    trigger: AUTOMATION_TRIGGERS.pullRequestMerged,
    title: "{{workItemKey}} · PR #{{pullRequestNumber}} merged",
    message:
      "{{repositoryFullName}}\n{{title}}\n{{pullRequestUrl}}",
  },
];

@Injectable()
export class DiscordDefaultAutomationsService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @OnEvent(DISCORD_PROJECT_PROVISIONED_EVENT, { async: true })
  async ensureDefaults(event: DiscordProjectProvisionedEvent): Promise<void> {
    const collection = this.connection.collection("automation_rules");
    for (const rule of DEFAULT_RULES) {
      const now = new Date();
      await collection.updateOne(
        {
          workspaceId: event.workspaceId,
          projectKey: event.projectKey.toUpperCase(),
          name: rule.name,
        },
        {
          $setOnInsert: {
            workspaceId: event.workspaceId,
            projectKey: event.projectKey.toUpperCase(),
            name: rule.name,
            enabled: true,
            trigger: rule.trigger,
            executionMode: AUTOMATION_EXECUTION_MODES.event,
            conditions: [],
            actions: [
              {
                type: AUTOMATION_ACTIONS.notifyDiscord,
                config: {
                  title: rule.title,
                  message: rule.message,
                },
              },
            ],
            runCount: 0,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      );
    }
  }
}
