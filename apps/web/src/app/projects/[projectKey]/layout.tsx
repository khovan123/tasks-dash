import { apiData } from "@/lib/server/api-data";
import { ProjectNavBar } from "@/components/project-nav-bar";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const project = await apiData<{ name: string; key: string }>(`/projects/${key}`).catch(() => ({ name: key, key }));

  return (
    <div className="flex flex-col min-h-screen">
      <ProjectNavBar projectKey={key} projectName={project.name} />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
