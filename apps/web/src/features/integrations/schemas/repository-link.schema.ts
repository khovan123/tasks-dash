import { z } from "zod";

export const repositoryLinkSchema = z.object({
  repositoryId: z
    .string()
    .min(1, "Hãy chọn repository.")
    .transform((value) => Number(value))
    .refine(
      (value) => Number.isSafeInteger(value) && value > 0,
      "Repository không hợp lệ.",
    ),
});

export type RepositoryLinkFormValues = z.input<typeof repositoryLinkSchema>;
export type RepositoryLinkPayload = z.output<typeof repositoryLinkSchema>;
