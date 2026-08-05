import { z } from "zod";

const snowflake = /^\d{17,20}$/;
const hasProjectVariable = (value: string) =>
  value.includes("{{projectKey}}") || value.includes("{{projectName}}");

export const discordWorkspaceFormSchema = z
  .object({
    guildId: z.string().trim().regex(snowflake, "Guild ID không hợp lệ."),
    categoryId: z
      .string()
      .trim()
      .refine((value) => !value || snowflake.test(value), {
        message: "Category ID không hợp lệ.",
      }),
    channelNameTemplate: z.string().trim().min(3).max(100),
    docsChannelNameTemplate: z.string().trim().min(3).max(100),
  })
  .refine((values) => hasProjectVariable(values.channelNameTemplate), {
    path: ["channelNameTemplate"],
    message: "Template phải có {{projectKey}} hoặc {{projectName}}.",
  })
  .refine((values) => hasProjectVariable(values.docsChannelNameTemplate), {
    path: ["docsChannelNameTemplate"],
    message: "Template phải có {{projectKey}} hoặc {{projectName}}.",
  });

export type DiscordWorkspaceFormValues = z.infer<typeof discordWorkspaceFormSchema>;
