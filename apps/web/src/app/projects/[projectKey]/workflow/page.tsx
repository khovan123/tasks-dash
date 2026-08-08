import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { WorkflowEditorForm } from "@/components/organisms/workflow-editor-form";
import { AppPage } from "@/components/templates/app-page";
import {
  hasWorkspaceRole,
  loadWorkspaceAccess,
} from "@/features/members/server/load-workspace-access";
import type { WorkflowDefinition } from "@/features/workflow/types";
import { apiProjectData } from "@/lib/server/project-access";

export const dynamic = "force-dynamic";

export default async function WorkflowSettingsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [workflow, access] = await Promise.all([
    apiProjectData<WorkflowDefinition | null>(`/projects/${key}/workflow`),
    loadWorkspaceAccess(),
  ]);
  const canManage = hasWorkspaceRole(access.currentRole, [MEMBER_ROLES.owner]);

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
