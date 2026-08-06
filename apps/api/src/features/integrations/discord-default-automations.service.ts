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
    title: "PR #{{pullRequestNumber}} opened · {{workItemKey}}",
    message: "{{repositoryFullName}}\n{{title}}\n{{pullRequestUrl}}",
  },
  {
    name: "Discord · Pull request merged",
    trigger: AUTOMATION_TRIGGERS.pullRequestMerged,
    title: "PR #{{pullRequestNumber}} merged · {{workItemKey}}",
    message: "{{repositoryFullName}}\n{{title}}\n{{pullRequestUrl}}",
  },
  {
    name: "Discord · Pull request review comment",
    trigger: AUTOMATION_TRIGGERS.pullRequestReviewCommented,
    title: "PR Review Comment · {{workItemKey}}",
    message: "New review comment on PR #{{pullRequestNumber}}",
  },
  {
    name: "Discord · Pull request approved",
    trigger: AUTOMATION_TRIGGERS.pullRequestApproved,
    title: "PR #{{pullRequestNumber}} Approved · {{workItemKey}}",
    message: "Pull request has been approved and is ready to merge",
  },
  {
    name: "Discord · CI/CD build status",
    trigger: AUTOMATION_TRIGGERS.ciCdDeploymentSuccess,
    title: "CI/CD Deployment · {{projectKey}}",
    message: "Deployment status log ref link",
  },
  {
    name: "Discord · Work item created",
    trigger: AUTOMATION_TRIGGERS.workItemCreated,
    title: "Task created · {{workItemKey}}",
    message: "{{title}}",
  },
  {
    name: "Discord · Work item completed",
    trigger: AUTOMATION_TRIGGERS.workItemTransitioned,
    title: "Task completed · {{workItemKey}}",
    message: "{{title}} moved to DONE",
  },
  {
    name: "Discord · Member joined",
    trigger: AUTOMATION_TRIGGERS.memberAdded,
    title: "Member update · {{projectKey}}",
    message: "Project members list synchronized",
  },
  {
    name: "Discord · Document created",
    trigger: AUTOMATION_TRIGGERS.documentCreated,
    title: "Document update · {{projectKey}}",
    message: "Document channel updated",
  },
  {
    name: "Discord · Design catalog updated",
    trigger: AUTOMATION_TRIGGERS.designCatalogUpdated,
    title: "Design catalog update · {{projectKey}}",
    message: "Figma design link logged",
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
