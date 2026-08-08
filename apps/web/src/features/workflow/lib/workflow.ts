import {
  SYSTEM_WORKFLOW_STATUS_IDS,
  SYSTEM_WORKFLOW_TRANSITION_PAIRS,
} from "@/features/workflow/constants";

export function isSystemWorkflowStatus(statusId: string): boolean {
  return SYSTEM_WORKFLOW_STATUS_IDS.has(statusId);
}

export function isSystemWorkflowTransition(
  fromStatusId: string,
  toStatusId: string,
): boolean {
  return SYSTEM_WORKFLOW_TRANSITION_PAIRS.has(
    `${fromStatusId}:${toStatusId}`,
  );
}

export function generateWorkflowStatusId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}
