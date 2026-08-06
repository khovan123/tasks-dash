import type { MemberRole } from "@tasks-dash/contracts";
import { WorkspaceMembersView } from "@/components/workspace-members-view";
import type { JiraShellSession } from "@/components/layout/jira-app-shell";
import { apiData } from "@/lib/server/api-data";
import { AppPage } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

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

interface Project {
  _id: string;
  key: string;
  name: string;
  memberIds: string[];
}

export default async function WorkspaceMembersPage() {
  const [data, projects, session] = await Promise.all([
    apiData<WorkspaceMembersResponse>("/workspace/members"),
    apiData<Project[]>("/projects"),
    apiData<JiraShellSession>("/auth/me"),
  ]);
  const currentMemberRole =
    data.members.find((member) => member.email === session.email)?.role ?? null;

  return (
    <AppPage>
      <WorkspaceMembersView
        initialMembers={data.members}
        initialInvitations={data.invitations}
        projects={projects}
        currentMemberRole={currentMemberRole}
      />
    </AppPage>
  );
}
