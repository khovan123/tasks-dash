import { z } from "zod";
export const workflowSchema = z.object({ name: z.string().min(2), statuses: z.array(z.object({ id: z.string().min(1), name: z.string().min(2), category: z.string(), color: z.string(), order: z.number() })).min(2) });
export type WorkflowFormValues = z.infer<typeof workflowSchema>;
