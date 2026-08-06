import {
  AUTOMATION_TRIGGERS,
  type AutomationTrigger,
} from "@tasks-dash/contracts";
import { z } from "zod";

const DISCORD_TRIGGER_VALUES = [
  AUTOMATION_TRIGGERS.pullRequestOpened,
  AUTOMATION_TRIGGERS.pullRequestMerged,
  AUTOMATION_TRIGGERS.pullRequestClosed,
  AUTOMATION_TRIGGERS.pullRequestReviewCommented,
  AUTOMATION_TRIGGERS.pullRequestApproved,
  AUTOMATION_TRIGGERS.githubPushCommit,
  AUTOMATION_TRIGGERS.githubIssueCreated,
  AUTOMATION_TRIGGERS.ciCdDeploymentSuccess,
  AUTOMATION_TRIGGERS.ciCdDeploymentFailed,
  AUTOMATION_TRIGGERS.workItemCreated,
  AUTOMATION_TRIGGERS.workItemTransitioned,
  AUTOMATION_TRIGGERS.memberAdded,
  AUTOMATION_TRIGGERS.documentCreated,
  AUTOMATION_TRIGGERS.documentDeleted,
  AUTOMATION_TRIGGERS.designCatalogUpdated,
  AUTOMATION_TRIGGERS.scheduled,
] as const satisfies readonly [AutomationTrigger, ...AutomationTrigger[]];

export const discordAutomationSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    trigger: z.enum(DISCORD_TRIGGER_VALUES),
    cronExpression: z.string().trim().optional(),
    channelType: z.string().trim(),
    title: z.string().trim().min(1).max(256),
    message: z.string().trim().min(1).max(4000),
  })
  .refine(
    (data) => {
      if (data.trigger === AUTOMATION_TRIGGERS.scheduled) {
        return Boolean(
          data.cronExpression && data.cronExpression.trim().length > 0,
        );
      }
      return true;
    },
    {
      message: "Vui lòng nhập biểu thức Cron cho lịch chạy (ví dụ: 0 9 * * *).",
      path: ["cronExpression"],
    },
  );

export type DiscordAutomationValues = z.infer<typeof discordAutomationSchema>;
