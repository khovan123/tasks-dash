"use client";

import { useEffect, useMemo } from "react";
import { DesignerCatalogManager } from "@/components/designer-catalog-manager";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  replaceDesignCatalog,
  selectDesignCatalog,
  selectDesignCatalogHydrated,
  type RealtimeDesignCatalogItem,
} from "@/lib/store/realtime-slice";

export function RealtimeDesignerCatalogManager({
  projectKey,
  initialItems,
  canManageCatalog,
}: {
  projectKey: string;
  initialItems: RealtimeDesignCatalogItem[];
  canManageCatalog: boolean;
}) {
  const dispatch = useAppDispatch();
  const selector = useMemo(() => selectDesignCatalog(projectKey), [projectKey]);
  const realtimeItems = useAppSelector(selector);
  const hydrated = useAppSelector(selectDesignCatalogHydrated(projectKey));

  useEffect(() => {
    dispatch(replaceDesignCatalog({ projectKey, items: initialItems }));
  }, [dispatch, initialItems, projectKey]);

  return (
    <DesignerCatalogManager
      projectKey={projectKey}
      items={hydrated ? realtimeItems : initialItems}
      canManageCatalog={canManageCatalog}
    />
  );
}
