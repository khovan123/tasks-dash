import {
  PRIORITIES,
  type Priority,
  WORK_ITEM_TYPES,
  type WorkItemType,
} from "@tasks-dash/contracts";
import type {
  DetailWorkItem,
  WorkItemView,
} from "@/features/work-items/types";
import type { WorkItemFormInput } from "@/features/work-items/schemas/work-item-form.schema";
import { parseCommaSeparatedValues } from "@/lib/text-list";

export const WORK_ITEM_FORM_DEFAULT_VALUES: WorkItemFormInput = {
  type: WORK_ITEM_TYPES.task,
  summary: "",
  description: "",
  statusId: "",
  priority: PRIORITIES.medium,
  assigneeId: "",
  storyPoints: undefined,
  dueDate: "",
  startDate: "",
  labels: "",
  figmaLinks: [],
  documentLinks: [],
};

export const PRIORITY_VALUES = Object.values(PRIORITIES) as Priority[];
export const WORK_ITEM_TYPE_VALUES = Object.values(WORK_ITEM_TYPES) as WorkItemType[];

export function normalizeWorkItemTypeValue(type: string): WorkItemType {
  const normalized = (type ?? "").trim().toUpperCase();
  switch (normalized) {
    case "EPIC":
    case "MODULE":
      return WORK_ITEM_TYPES.module;
    case "STORY":
      return WORK_ITEM_TYPES.story;
    case "TASK":
      return WORK_ITEM_TYPES.task;
    case "BUG":
      return WORK_ITEM_TYPES.bug;
    case "SUB_TASK":
    case "SUBTASK":
      return WORK_ITEM_TYPES.subTask;
    default:
      return WORK_ITEM_TYPES.task;
  }
}

export function normalizeWorkItem<T extends WorkItemView>(item: T): T {
  const startDate = item.startDate ?? item.startedAt;
  return {
    ...item,
    startDate,
    startedAt: startDate,
    labels: item.labels ?? [],
    figmaLinks: item.figmaLinks ?? [],
    documentLinks: item.documentLinks ?? [],
  };
}

export function normalizeDetailWorkItem(item: DetailWorkItem): DetailWorkItem {
  return normalizeWorkItem(item);
}

export function workItemCreatePayload(
  values: {
    type: string;
    summary: string;
    description: string;
    priority: string;
    statusId: string;
    assigneeId: string;
    storyPoints?: number;
    dueDate: string;
    startDate: string;
    labels: string;
    figmaLinks: Array<{ label: string; url: string }>;
    documentLinks: Array<{ label: string; url: string }>;
  },
  sprintId?: string | null,
): Record<string, unknown> {
  return {
    type: values.type,
    summary: values.summary,
    description: values.description,
    priority: values.priority,
    sprintId: sprintId || undefined,
    statusId:
      values.statusId === "default_backend" || !values.statusId
        ? undefined
        : values.statusId,
    assigneeId:
      values.assigneeId === "unassigned" || !values.assigneeId
        ? undefined
        : values.assigneeId,
    storyPoints: values.storyPoints,
    dueDate: values.dueDate || undefined,
    startDate: values.startDate || undefined,
    labels: parseCommaSeparatedValues(values.labels),
    figmaLinks: values.figmaLinks.filter((link) => link.url),
    documentLinks: values.documentLinks.filter((link) => link.url),
  };
}
