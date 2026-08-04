import { z } from "zod";

export const projectFormSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z][A-Za-z0-9]{1,9}$/)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(1).max(1000),
  repositoryFullName: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/)
    .or(z.literal("")),
  driveRootFolderId: z.string().trim().max(256),
});

export type ProjectFormValues = z.input<typeof projectFormSchema>;
export type ProjectFormPayload = z.output<typeof projectFormSchema>;
