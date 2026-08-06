import { MEMBER_ROLES, type MemberRole } from "@tasks-dash/contracts";
import type { JiraShellSession } from "@/components/layout/jira-app-shell";
import { apiData } from "@/lib/server/api-data";
import { AppPage } from "@/components/layout/app-shell";
import { WorkflowEditorForm } from "@/components/workflow-editor-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

interface Project {
  key: string;
  name: string;
}

interface WorkflowStatus {
  id: string;
  name: string;
  category: "TODO" | "IN_PROGRESS" | "DONE";
  color?: string;
  order: number;
}

interface Workflow {
  name: string;
  defaultStatusId: string;
  statuses: WorkflowStatus[];
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: MemberRole;
  status: string;
  lastLoginAt?: string;
}

interface WorkspaceInvitation {
  _id: string;
  email: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  lastSentAt?: string;
}

interface WorkspaceMembersResponse {
  workspace: { workspaceId: string; name: string; slug?: string };
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}

export default async function WorkflowSettingsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();

  const [project, workflow, workspaceMembers, session] = await Promise.all([
    apiData<Project>(`/projects/${key}`),
    apiData<Workflow | null>(`/projects/${key}/workflow`).catch(() => null),
    apiData<WorkspaceMembersResponse>("/workspace/members"),
    apiData<JiraShellSession>("/auth/me"),
  ]);
  const canManage =
    workspaceMembers.members.find((member) => member.email === session.email)
      ?.role === MEMBER_ROLES.owner;

  return (
    <AppPage>
      <WorkflowEditorForm
        projectKey={key}
        initialWorkflow={workflow}
        canManage={canManage}
      />
    </AppPage>
  );
}
