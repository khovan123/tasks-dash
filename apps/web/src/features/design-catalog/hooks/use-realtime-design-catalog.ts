"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  replaceDesignCatalog,
  selectDesignCatalog,
  selectDesignCatalogHydrated,
  type RealtimeDesignCatalogItem,
} from "@/lib/store/realtime-slice";

export function useRealtimeDesignCatalog(
  projectKey: string,
  initialItems: RealtimeDesignCatalogItem[],
): RealtimeDesignCatalogItem[] {
  const dispatch = useAppDispatch();
  const selector = useMemo(() => selectDesignCatalog(projectKey), [projectKey]);
  const realtimeItems = useAppSelector(selector);
  const hydrated = useAppSelector(selectDesignCatalogHydrated(projectKey));

  useEffect(() => {
    dispatch(replaceDesignCatalog({ projectKey, items: initialItems }));
  }, [dispatch, initialItems, projectKey]);

  return hydrated ? realtimeItems : initialItems;
}
