import { z } from "zod";

export const discordFormSchema = z.object({
  projectKey: z.string().trim().min(2).max(10),
  webhookUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        (url.hostname === "discord.com" || url.hostname === "discordapp.com") &&
        /^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9._-]+$/.test(url.pathname)
      );
    }, "Webhook URL Discord không hợp lệ."),
});

export type DiscordFormValues = z.infer<typeof discordFormSchema>;
