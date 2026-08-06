import { MEMBER_ROLES, type MemberRole } from "@tasks-dash/contracts";
import type { JiraShellSession } from "@/components/layout/jira-app-shell";
import { apiData } from "@/lib/server/api-data";
import { AppPage } from "@/components/layout/app-shell";
import { ProjectSettingsForm } from "@/components/project-settings-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

interface Project {
  key: string;
  name: string;
  description?: string;
  color?: string;
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

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [project, workspaceMembers, session] = await Promise.all([
    apiData<Project>(`/projects/${key}`),
    apiData<WorkspaceMembersResponse>("/workspace/members"),
    apiData<JiraShellSession>("/auth/me"),
  ]);
  const canManage =
    workspaceMembers.members.find((member) => member.email === session.email)
      ?.role === MEMBER_ROLES.owner;

  return (
    <AppPage>
      {canManage ? (
        <ProjectSettingsForm project={project} />
      ) : (
        <Alert>
          <AlertTitle>Chỉ owner mới quản lý project settings</AlertTitle>
          <AlertDescription>
            Workspace role hiện tại không được đổi thông tin hoặc xóa dự án này.
          </AlertDescription>
        </Alert>
      )}
    </AppPage>
  );
}
