import { BacklogBoard } from "@/components/backlog-board";
import type { GithubWorkItemView } from "@/components/github-work-item-links";
import { apiData } from "@/lib/server/api-data";
import { AppPage } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

interface WorkItem {
  key: string;
  summary: string;
  type: string;
  priority: string;
  statusId: string;
  rank: number;
  dueDate?: string;
  startDate?: string;
  startedAt?: string;
  github?: GithubWorkItemView;
}
interface Workflow {
  statuses: Array<{ id: string; name: string; color?: string }>;
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export default async function BacklogPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [items, workflow, membersData, session] = await Promise.all([
    apiData<WorkItem[]>(`/projects/${key}/work-items`),
    apiData<Workflow | null>(`/projects/${key}/workflow`),
    apiData<{ projectMembers: any[]; workspaceMembers: any[] }>(`/projects/${key}/members`),
    apiData<{ email: string }>("/auth/me"),
  ]);
  const statusNames = Object.fromEntries(
    (workflow?.statuses ?? []).map((status) => [status.id, status.name]),
  );
  const statuses = workflow?.statuses ?? [
    { id: "TO_DO", name: "ToDo", color: "#9ca3af" },
    { id: "IN_PROGRESS", name: "In Progress", color: "#2563eb" },
    { id: "REVIEW", name: "Review", color: "#7c3aed" },
    { id: "REQUEST_CHANGE", name: "Request Change", color: "#dc2626" },
    { id: "DONE", name: "Done", color: "#16a34a" },
  ];
  const members = membersData.projectMembers.map((member) => ({
    id: member._id,
    name: member.name,
    email: member.email,
    avatarUrl: member.avatarUrl,
  }));
  const normalizedItems = items.map((item) => ({
    ...item,
    startDate: item.startDate ?? item.startedAt,
  }));

  const currentMemberRole =
    membersData.workspaceMembers?.find((member) => member.email === session.email)?.role ?? null;
  const canCreateWorkItem = currentMemberRole === "OWNER" || currentMemberRole === "DEV";

  return (
    <AppPage>
      <BacklogBoard
        projectKey={key}
        initialItems={normalizedItems}
        statusNames={statusNames}
        statuses={statuses}
        members={members}
        canCreateWorkItem={canCreateWorkItem}
      />
    </AppPage>
  );
}
