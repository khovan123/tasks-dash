import { ProjectOverviewRealtime } from "@/components/project-overview-realtime";
import type { GithubRepositoryOption } from "@/components/repository-link-form";
import { AppPage } from "@/components/layout/app-shell";
import { apiData } from "@/lib/server/api-data";
import { apiProjectData } from "@/lib/server/project-access";
import type {
  RealtimeProject,
  RealtimeWorkItem,
} from "@/lib/store/realtime-slice";

export const dynamic = "force-dynamic";

interface WorkflowStatus {
  id: string;
  name: string;
  category: string;
  color?: string;
}

interface Workflow {
  name: string;
  statuses: WorkflowStatus[];
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [project, items, workflow, membersData, repositories, session] =
    await Promise.all([
      apiProjectData<RealtimeProject>(`/projects/${key}`),
      apiProjectData<RealtimeWorkItem[]>(`/projects/${key}/work-items`),
      apiProjectData<Workflow | null>(`/projects/${key}/workflow`),
      apiProjectData<{ projectMembers: any[]; workspaceMembers: any[] }>(
        `/projects/${key}/members`,
      ),
      apiData<GithubRepositoryOption[]>("/integrations/github/repositories").catch(
        () => [],
      ),
      apiData<{ email: string }>("/auth/me"),
    ]);

  const currentMemberRole =
    membersData.workspaceMembers.find((member) => member.email === session.email)
      ?.role ?? null;

  return (
    <AppPage>
      <ProjectOverviewRealtime
        projectKey={key}
        initialProject={project}
        initialItems={items}
        statuses={workflow?.statuses ?? []}
        projectMembers={membersData.projectMembers}
        workspaceMembers={membersData.workspaceMembers}
        repositories={repositories}
        canManageRepository={currentMemberRole === "OWNER"}
        canCreateWorkItem={
          currentMemberRole === "OWNER" || currentMemberRole === "DEV"
        }
      />
    </AppPage>
  );
}
