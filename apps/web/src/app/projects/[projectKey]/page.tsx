import { ProjectOverviewRealtime } from "@/components/project-overview-realtime";
import type { GithubRepositoryOption } from "@/components/repository-link-form";
import { AppPage } from "@/components/templates/app-page";
import { loadProjectWorkItemsContext } from "@/features/work-items/server/load-project-work-items-context";
import { apiData } from "@/lib/server/api-data";
import { apiProjectData } from "@/lib/server/project-access";
import type { RealtimeProject } from "@/lib/store/realtime-slice";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [context, project, repositories] = await Promise.all([
    loadProjectWorkItemsContext(key),
    apiProjectData<RealtimeProject>(`/projects/${key}`),
    apiData<GithubRepositoryOption[]>("/integrations/github/repositories").catch(
      () => [],
    ),
  ]);

  return (
    <AppPage>
      <ProjectOverviewRealtime
        projectKey={context.key}
        initialProject={project}
        initialItems={context.items}
        statuses={context.statuses}
        projectMembers={context.membersData.projectMembers}
        workspaceMembers={context.membersData.workspaceMembers}
        repositories={repositories}
        canManageRepository={context.currentMemberRole === "OWNER"}
        canCreateWorkItem={context.canManageTasks}
      />
    </AppPage>
  );
}
