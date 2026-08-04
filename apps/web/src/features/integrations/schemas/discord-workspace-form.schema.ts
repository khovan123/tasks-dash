import { z } from "zod";

const snowflake = /^\d{17,20}$/;

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
  })
  .refine(
    (values) =>
      values.channelNameTemplate.includes("{{projectKey}}") ||
      values.channelNameTemplate.includes("{{projectName}}"),
    {
      path: ["channelNameTemplate"],
      message: "Template phải có {{projectKey}} hoặc {{projectName}}.",
    },
  );

export type DiscordWorkspaceFormValues = z.infer<
  typeof discordWorkspaceFormSchema
>;
