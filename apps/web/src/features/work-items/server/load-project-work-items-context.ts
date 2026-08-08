import "server-only";

import { apiData } from "@/lib/server/api-data";
import { apiProjectData } from "@/lib/server/project-access";
import type {
  ProjectMembersResponse,
  WorkflowStatusView,
  WorkItemMember,
  WorkItemView,
} from "@/features/work-items/types";

interface WorkflowResponse {
  name?: string;
  statuses: WorkflowStatusView[];
}

const DEFAULT_STATUSES: WorkflowStatusView[] = [
  { id: "TO_DO", name: "ToDo", category: "TODO", color: "#9ca3af" },
  {
    id: "IN_PROGRESS",
    name: "In Progress",
    category: "IN_PROGRESS",
    color: "#2563eb",
  },
  {
    id: "REVIEW",
    name: "Review",
    category: "IN_PROGRESS",
    color: "#7c3aed",
  },
  {
    id: "REQUEST_CHANGE",
    name: "Request Change",
    category: "IN_PROGRESS",
    color: "#dc2626",
  },
  { id: "DONE", name: "Done", category: "DONE", color: "#16a34a" },
];

export async function loadProjectWorkItemsContext(projectKey: string) {
  const key = projectKey.toUpperCase();
  const [items, workflow, membersData, session] = await Promise.all([
    apiProjectData<WorkItemView[]>(`/projects/${key}/work-items`),
    apiProjectData<WorkflowResponse | null>(`/projects/${key}/workflow`),
    apiProjectData<ProjectMembersResponse>(`/projects/${key}/members`),
    apiData<{ email: string }>("/auth/me"),
  ]);

  const statuses =
    workflow?.statuses && workflow.statuses.length > 0
      ? workflow.statuses
      : DEFAULT_STATUSES;
  const statusNames = Object.fromEntries(
    statuses.map((status) => [status.id, status.name]),
  );
  const members: WorkItemMember[] = membersData.projectMembers.map((member) => ({
    id: member._id,
    name: member.name,
    email: member.email,
    avatarUrl: member.avatarUrl,
    githubLogin: member.githubLogin,
    discordUsername: member.discordUsername,
  }));
  const normalizedItems = items.map((item) => ({
    ...item,
    startDate: item.startDate ?? item.startedAt,
  }));
  const currentMemberRole =
    membersData.workspaceMembers.find((member) => member.email === session.email)
      ?.role ?? null;

  return {
    key,
    items: normalizedItems,
    statuses,
    statusNames,
    members,
    membersData,
    currentMemberRole,
    canManageTasks:
      currentMemberRole === "OWNER" || currentMemberRole === "DEV",
    canCompleteSprint: currentMemberRole === "OWNER",
  };
}
