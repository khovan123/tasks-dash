import { z } from "zod";

export const workspaceFormSchema = z.object({
  workspaceName: z.string().trim().min(2).max(80),
  workspaceSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9-]{1,47}[a-z0-9]$/)
    .or(z.literal("")),
});

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
