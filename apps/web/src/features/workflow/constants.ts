import { DEFAULT_WORKFLOW_STATUS_IDS } from "@tasks-dash/contracts";
import type { WorkflowStatus } from "@/features/workflow/types";

export const WORKFLOW_PRESET_COLORS = [
  "#64748b",
  "#94a3b8",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#7c3aed",
  "#a855f7",
  "#10b981",
  "#22c55e",
  "#16a34a",
  "#14b8a6",
  "#f59e0b",
  "#f97316",
  "#fb923c",
  "#fbbf24",
  "#ef4444",
  "#dc2626",
  "#ec4899",
  "#f43f5e",
  "#06b6d4",
  "#38bdf8",
] as const;

export const SYSTEM_WORKFLOW_STATUSES: WorkflowStatus[] = [
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
    name: "ToDo",
    category: "TODO",
    color: "#9ca3af",
    order: 0,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
    name: "In Progress",
    category: "IN_PROGRESS",
    color: "#2563eb",
    order: 1,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.review,
    name: "Review",
    category: "IN_PROGRESS",
    color: "#7c3aed",
    order: 2,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
    name: "Request Change",
    category: "IN_PROGRESS",
    color: "#dc2626",
    order: 3,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.done,
    name: "Done",
    category: "DONE",
    color: "#16a34a",
    order: 4,
  },
];

export const SYSTEM_WORKFLOW_STATUS_IDS = new Set(
  SYSTEM_WORKFLOW_STATUSES.map((status) => status.id),
);

export const SYSTEM_WORKFLOW_TRANSITION_PAIRS = new Set([
  `${DEFAULT_WORKFLOW_STATUS_IDS.toDo}:${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}:${DEFAULT_WORKFLOW_STATUS_IDS.review}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.review}:${DEFAULT_WORKFLOW_STATUS_IDS.requestChange}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.requestChange}:${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}:${DEFAULT_WORKFLOW_STATUS_IDS.done}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.review}:${DEFAULT_WORKFLOW_STATUS_IDS.done}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.requestChange}:${DEFAULT_WORKFLOW_STATUS_IDS.done}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.done}:${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}`,
]);

export const GITHUB_WORKFLOW_AUTOMATION_NOTES = [
  { label: "PR hoặc branch mới", result: "Tự chuyển sang In Progress" },
  { label: "Request review / ready for review", result: "Tự chuyển sang Review" },
  { label: "Review = changes requested", result: "Tự chuyển sang Request Change" },
  { label: "Push commit mới", result: "Tự chuyển lại In Progress" },
  { label: "Merge hoặc close PR", result: "Tự chuyển sang Done" },
  { label: "Reopen PR", result: "Tự chuyển lại In Progress" },
] as const;
