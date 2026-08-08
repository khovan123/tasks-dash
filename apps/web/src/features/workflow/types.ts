export type WorkflowStatusCategory = "TODO" | "IN_PROGRESS" | "DONE";

export interface WorkflowStatus {
  id: string;
  name: string;
  category: WorkflowStatusCategory;
  color?: string;
  order: number;
}

export interface WorkflowTransition {
  id: string;
  name: string;
  fromStatusId: string;
  toStatusId: string;
  allowedRoleIds?: string[];
}

export interface WorkflowDefinition {
  name: string;
  defaultStatusId: string;
  statuses: WorkflowStatus[];
  transitions?: WorkflowTransition[];
}
