import { ProjectMembersManager } from "@/components/organisms/project-members-manager";
import { AppPage } from "@/components/templates/app-page";
import { loadProjectMembersPageContext } from "@/features/members/server/load-members-page-context";

export default async function ProjectMembersPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const context = await loadProjectMembersPageContext(projectKey);

  return (
    <AppPage>
      <ProjectMembersManager
        projectKey={context.key}
        projectId={context.projectId}
        initialProjectMembers={context.projectMembers}
        workspaceMembers={context.workspaceMembers}
        invitations={context.invitations}
        canManage={context.canManage}
      />
    </AppPage>
  );
}
