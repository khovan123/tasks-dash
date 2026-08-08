import { ProjectNavBar } from "@/components/project-nav-bar";
import { ProjectRealtimeBoundary } from "@/components/project-realtime-boundary";
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
  const project = await apiProjectData<{ name: string; key: string }>(
    `/projects/${key}`,
  );

  return (
    <ProjectRealtimeBoundary
      projectKey={key}
      projectName={project.name}
    >
      <div className="flex min-h-screen flex-col">
        <ProjectNavBar projectKey={key} projectName={project.name} />
        <div className="flex-1">{children}</div>
      </div>
    </ProjectRealtimeBoundary>
  );
}
