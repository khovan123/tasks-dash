"use client";

import { DesignerCatalogManager } from "@/components/organisms/designer-catalog-manager";
import { useRealtimeDesignCatalog } from "@/features/design-catalog/hooks/use-realtime-design-catalog";
import type { RealtimeDesignCatalogItem } from "@/lib/store/realtime-slice";

export function RealtimeDesignerCatalogManager({
  projectKey,
  initialItems,
  canManageCatalog,
}: {
  projectKey: string;
  initialItems: RealtimeDesignCatalogItem[];
  canManageCatalog: boolean;
}) {
  const items = useRealtimeDesignCatalog(projectKey, initialItems);

  return (
    <DesignerCatalogManager
      projectKey={projectKey}
      items={items}
      canManageCatalog={canManageCatalog}
    />
  );
}
