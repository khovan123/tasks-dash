import {
  PRIORITIES,
  type Priority,
  WORK_ITEM_TYPES,
  type WorkItemType,
} from "@tasks-dash/contracts";
import { z } from "zod";

const WORK_ITEM_TYPE_VALUES = Object.values(WORK_ITEM_TYPES) as [
  WorkItemType,
  ...WorkItemType[],
];
const PRIORITY_VALUES = Object.values(PRIORITIES) as [Priority, ...Priority[]];

export const externalLinkSchema = z.object({
  label: z.string().trim().max(120),
  url: z.string().trim().url().or(z.literal("")),
});

export const workItemFormSchema = z.object({
  type: z.enum(WORK_ITEM_TYPE_VALUES),
  summary: z.string().trim().min(2).max(240),
  description: z.string().trim().max(10_000),
  statusId: z.string().trim(),
  priority: z.enum(PRIORITY_VALUES),
  assigneeId: z.string().trim(),
  storyPoints: z.preprocess(
    (value) => (value === "" || value === undefined ? undefined : Number(value)),
    z.number().int().min(0).max(100).optional(),
  ),
  dueDate: z.string().trim(),
  startDate: z.string().trim(),
  labels: z.string().trim(),
  figmaLinks: z.array(externalLinkSchema).max(30),
  documentLinks: z.array(externalLinkSchema).max(30),
});

export type WorkItemFormInput = z.input<typeof workItemFormSchema>;
export type WorkItemFormValues = z.output<typeof workItemFormSchema>;
