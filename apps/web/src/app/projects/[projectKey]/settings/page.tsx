import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { ProjectSettingsForm } from "@/components/organisms/project-settings-form";
import { AppPage } from "@/components/templates/app-page";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  hasWorkspaceRole,
  loadWorkspaceAccess,
} from "@/features/members/server/load-workspace-access";
import { apiProjectData } from "@/lib/server/project-access";

export const dynamic = "force-dynamic";

interface Project {
  key: string;
  name: string;
  description?: string;
  color?: string;
}

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [project, access] = await Promise.all([
    apiProjectData<Project>(`/projects/${key}`),
    loadWorkspaceAccess(),
  ]);
  const canManage = hasWorkspaceRole(access.currentRole, [MEMBER_ROLES.owner]);

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
