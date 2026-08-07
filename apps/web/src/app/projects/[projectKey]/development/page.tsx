import { apiProjectResponse } from "@/lib/server/project-access";
import { AppPage, SectionHeading } from "@/components/layout/app-shell";
import { ProjectDevelopmentManager } from "@/components/project-development-manager";

export const dynamic = "force-dynamic";

export default async function DevelopmentPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();

  const [prsResponse, envResponse, membersResponse, sessionResponse] = await Promise.all([
    apiProjectResponse(`/projects/${key}/development/pull-requests`),
    apiProjectResponse(`/projects/${key}/env`),
    apiProjectResponse(`/projects/${key}/members`),
    apiProjectResponse(`/auth/me`),
  ]);

  const prsPayload = await prsResponse.json().catch(() => null);
  const envPayload = await envResponse.json().catch(() => null);
  const membersPayload = await membersResponse.json().catch(() => null);
  const sessionPayload = await sessionResponse.json().catch(() => null);

  const prs = prsPayload?.ok ? prsPayload.data : [];
  const envs = envPayload?.ok ? envPayload.data : {};
  const projectMembers = membersPayload?.ok ? (membersPayload.data.projectMembers || []) : [];
  const workspaceMembers = membersPayload?.ok ? (membersPayload.data.workspaceMembers || []) : [];
  const session = sessionPayload?.ok ? sessionPayload.data : null;

  const currentWorkspaceMember = workspaceMembers.find((m: any) => m.email === session?.email);
  const currentProjectMember = projectMembers.find((m: any) => m.email === session?.email);

  const canUpdate =
    currentWorkspaceMember?.role === "OWNER" ||
    currentProjectMember?.role === "OWNER" ||
    currentProjectMember?.role === "DEV";

  const isOwner =
    currentWorkspaceMember?.role === "OWNER" ||
    currentProjectMember?.role === "OWNER";

  return (
    <AppPage>
      <div className="flex flex-col gap-6">
        <SectionHeading
          eyebrow="Development"
          title="Development Workspace"
          meta={`${key} integrations & configs`}
        />
        <ProjectDevelopmentManager
          projectKey={key}
          initialPRs={prs}
          initialEnvs={envs}
          canUpdate={canUpdate}
          isOwner={isOwner}
        />
      </div>
    </AppPage>
  );
}
