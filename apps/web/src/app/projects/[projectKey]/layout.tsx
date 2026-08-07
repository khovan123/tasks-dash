import { apiData } from "@/lib/server/api-data";
import { ProjectNavBar } from "@/components/project-nav-bar";
import { ProjectRealtimeBoundary } from "@/components/project-realtime-boundary";
import type { JiraShellSession } from "@/components/layout/jira-app-shell";
import { apiProjectData } from "@/lib/server/project-access";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [project, session] = await Promise.all([
    apiProjectData<{ name: string; key: string }>(`/projects/${key}`),
    apiData<JiraShellSession>("/auth/me"),
  ]);

  return (
    <ProjectRealtimeBoundary
      projectKey={key}
      projectName={project.name}
      memberId={session.memberId}
    >
      <div className="flex flex-col min-h-screen">
        <ProjectNavBar projectKey={key} projectName={project.name} />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </ProjectRealtimeBoundary>
  );
}
