import { WorkspaceMembersView } from "@/components/organisms/workspace-members-view";
import { AppPage } from "@/components/templates/app-page";
import { loadWorkspaceMembersPageContext } from "@/features/members/server/load-members-page-context";

export const dynamic = "force-dynamic";

export default async function WorkspaceMembersPage() {
  const context = await loadWorkspaceMembersPageContext();

  return (
    <AppPage>
      <WorkspaceMembersView
        initialMembers={context.members}
        initialInvitations={context.invitations}
        projects={context.projects}
        currentMemberRole={context.currentRole}
      />
    </AppPage>
  );
}
