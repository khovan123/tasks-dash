import { MEMBER_ROLES, type MemberRole } from "@tasks-dash/contracts";
import type { JiraShellSession } from "@/components/layout/jira-app-shell";
import { apiData } from "@/lib/server/api-data";
import { apiProjectData } from "@/lib/server/project-access";
import { AppPage, PageHero } from "@/components/layout/app-shell";
import { ProjectMembersManager } from "@/components/project-members-manager";

interface Member {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface WorkspaceInvitation {
  _id: string;
  email: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  lastSentAt?: string;
}

interface Project {
  _id: string;
  key: string;
  name: string;
}

export default async function ProjectMembersPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();

  const [project, membersData, workspaceMembersData, session] =
    await Promise.all([
      apiProjectData<Project>(`/projects/${key}`),
      apiProjectData<{ projectMembers: Member[]; workspaceMembers: Member[] }>(
        `/projects/${key}/members`,
      ),
      apiData<{ invitations: WorkspaceInvitation[] }>("/workspace/members"),
      apiData<JiraShellSession>("/auth/me"),
    ]);
  const canManage =
    membersData.workspaceMembers.find(
      (member) => member.email === session.email,
    )?.role === MEMBER_ROLES.owner;

  return (
    <AppPage>
      <div className="w-full mt-5">
        <ProjectMembersManager
          projectKey={key}
          projectId={project._id}
          initialProjectMembers={membersData.projectMembers}
          workspaceMembers={membersData.workspaceMembers}
          invitations={workspaceMembersData.invitations}
          canManage={canManage}
        />
      </div>
    </AppPage>
  );
}
