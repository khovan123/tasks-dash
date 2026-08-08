import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { RealtimeDesignerCatalogManager } from "@/components/organisms/realtime-designer-catalog-manager";
import { AppPage } from "@/components/templates/app-page";
import {
  hasWorkspaceRole,
  loadWorkspaceAccess,
} from "@/features/members/server/load-workspace-access";
import { apiProjectData } from "@/lib/server/project-access";
import type { RealtimeDesignCatalogItem } from "@/lib/store/realtime-slice";

export const dynamic = "force-dynamic";

export default async function DesignerPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [items, access] = await Promise.all([
    apiProjectData<RealtimeDesignCatalogItem[]>(`/projects/${key}/design-catalog`),
    loadWorkspaceAccess(),
  ]);
  const canManageCatalog = hasWorkspaceRole(access.currentRole, [
    MEMBER_ROLES.owner,
    MEMBER_ROLES.designer,
  ]);

  return (
    <AppPage>
      <RealtimeDesignerCatalogManager
        projectKey={key}
        initialItems={items}
        canManageCatalog={canManageCatalog}
      />
    </AppPage>
  );
}
