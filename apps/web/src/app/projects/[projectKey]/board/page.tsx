import { apiData } from "@/lib/server/api-data";
import { apiProjectData } from "@/lib/server/project-access";
import { KanbanBoard } from "@/components/kanban-board";
import { AppPage } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

interface Project {
  key: string;
  name: string;
  description: string;
}

interface WorkItem {
  key: string;
  summary: string;
  type: string;
  statusId: string;
  priority: string;
  storyPoints?: number;
  dueDate?: string;
  startDate?: string;
  startedAt?: string;
  labels: string[];
  assigneeId?: string;
}

interface WorkflowStatus {
  id: string;
  name: string;
  category: string;
  color?: string;
}

interface Workflow {
  name: string;
  statuses: WorkflowStatus[];
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();

  const [project, items, workflow, membersData, session] = await Promise.all([
    apiProjectData<Project>(`/projects/${key}`),
    apiProjectData<WorkItem[]>(`/projects/${key}/work-items`),
    apiProjectData<Workflow | null>(`/projects/${key}/workflow`),
    apiProjectData<{ projectMembers: any[]; workspaceMembers: any[] }>(`/projects/${key}/members`),
    apiData<{ email: string }>("/auth/me"),
  ]);

  const defaultStatuses: WorkflowStatus[] = [
    { id: "TO_DO", name: "ToDo", category: "TODO" },
    { id: "IN_PROGRESS", name: "In Progress", category: "IN_PROGRESS" },
    { id: "REVIEW", name: "Review", category: "IN_PROGRESS" },
    { id: "REQUEST_CHANGE", name: "Request Change", category: "IN_PROGRESS" },
    { id: "DONE", name: "Done", category: "DONE" },
  ];

  const statuses = workflow?.statuses && workflow.statuses.length > 0
    ? workflow.statuses
    : defaultStatuses;

  const members = membersData.projectMembers.map((member) => ({
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
    membersData.workspaceMembers?.find((member) => member.email === session.email)?.role ?? null;
  const canManageTasks = currentMemberRole === "OWNER" || currentMemberRole === "DEV";
  const canCompleteSprint = currentMemberRole === "OWNER";

  return (
    <AppPage>
      <KanbanBoard
        projectKey={key}
        initialItems={normalizedItems}
        statuses={statuses}
        members={members}
        canManageTasks={canManageTasks}
        canCompleteSprint={canCompleteSprint}
      />
    </AppPage>
  );
}
