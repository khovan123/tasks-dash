import { MEMBER_ROLES, type MemberRole } from "@tasks-dash/contracts";
import { DesignerCatalogManager } from "@/components/designer-catalog-manager";
import type { JiraShellSession } from "@/components/layout/jira-app-shell";
import { apiData } from "@/lib/server/api-data";
import { apiProjectData } from "@/lib/server/project-access";
import { AppPage } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

interface DesignCatalogItem {
  _id: string;
  name: string;
  type: string;
  figmaUrl: string;
  description: string;
  tags: string[];
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: MemberRole;
  status: string;
  lastLoginAt?: string;
}

interface WorkspaceInvitation {
  _id: string;
  email: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  lastSentAt?: string;
}

interface WorkspaceMembersResponse {
  workspace: { workspaceId: string; name: string; slug?: string };
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}

export default async function DesignerPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [items, workspaceMembers, session] = await Promise.all([
    apiProjectData<DesignCatalogItem[]>(`/projects/${key}/design-catalog`),
    apiData<WorkspaceMembersResponse>("/workspace/members"),
    apiData<JiraShellSession>("/auth/me"),
  ]);
  const currentRole =
    workspaceMembers.members.find((member) => member.email === session.email)
      ?.role ?? null;
  const canManageCatalog =
    currentRole === MEMBER_ROLES.owner ||
    currentRole === MEMBER_ROLES.designer;
  return (
    <AppPage>
      <DesignerCatalogManager
        projectKey={key}
        items={items}
        canManageCatalog={canManageCatalog}
      />
    </AppPage>
  );
}
