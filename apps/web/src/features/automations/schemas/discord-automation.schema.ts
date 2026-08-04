import {
  AUTOMATION_TRIGGERS,
  type AutomationTrigger,
} from "@tasks-dash/contracts";
import { z } from "zod";

const DISCORD_TRIGGER_VALUES = [
  AUTOMATION_TRIGGERS.pullRequestOpened,
  AUTOMATION_TRIGGERS.pullRequestMerged,
] as const satisfies readonly [AutomationTrigger, ...AutomationTrigger[]];

export const discordAutomationSchema = z.object({
  name: z.string().trim().min(3).max(120),
  trigger: z.enum(DISCORD_TRIGGER_VALUES),
  title: z.string().trim().min(1).max(256),
  message: z.string().trim().min(1).max(4000),
});

export type DiscordAutomationValues = z.infer<typeof discordAutomationSchema>;
