import { ProjectDevelopmentManager } from "@/components/organisms/project-development-manager";
import { SectionHeading } from "@/components/molecules/section-heading";
import { AppPage } from "@/components/templates/app-page";
import { loadDevelopmentPageContext } from "@/features/development/server/load-development-page-context";

export const dynamic = "force-dynamic";

export default async function DevelopmentPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const context = await loadDevelopmentPageContext(projectKey);

  return (
    <AppPage>
      <div className="flex flex-col gap-6">
        <SectionHeading
          eyebrow="Development"
          title="Development Workspace"
          meta={`${context.key} integrations & configs`}
        />
        <ProjectDevelopmentManager
          projectKey={context.key}
          initialPRs={context.pullRequests}
          initialEnvs={context.env}
          canUpdate={context.canUpdate}
          isOwner={context.isOwner}
        />
      </div>
    </AppPage>
  );
}
