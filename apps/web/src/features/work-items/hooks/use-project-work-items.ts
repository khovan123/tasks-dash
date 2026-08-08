"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  replaceWorkItems,
  selectWorkItemsByProject,
  selectWorkItemsHydrated,
  type RealtimeWorkItem,
} from "@/lib/store/realtime-slice";

export function mergeWorkItem<T extends { key: string }>(
  items: T[],
  nextItem: Partial<T> & { key: string },
): T[] {
  const index = items.findIndex((item) => item.key === nextItem.key);
  if (index < 0) return [...items, nextItem as T];
  return items.map((item, itemIndex) =>
    itemIndex === index ? { ...item, ...nextItem } : item,
  );
}

export function useProjectWorkItems<T extends RealtimeWorkItem>(
  projectKey: string,
  initialItems: T[],
): {
  items: T[];
  setItems: Dispatch<SetStateAction<T[]>>;
} {
  const dispatch = useAppDispatch();
  const itemsSelector = useMemo(
    () => selectWorkItemsByProject(projectKey),
    [projectKey],
  );
  const hydratedSelector = useMemo(
    () => selectWorkItemsHydrated(projectKey),
    [projectKey],
  );
  const realtimeItems = useAppSelector(itemsSelector);
  const realtimeHydrated = useAppSelector(hydratedSelector);
  const [items, setItems] = useState<T[]>(initialItems);

  useEffect(() => {
    if (!realtimeHydrated) {
      dispatch(
        replaceWorkItems({
          projectKey,
          items: initialItems,
          bumpRevision: false,
        }),
      );
    }
  }, [dispatch, initialItems, projectKey, realtimeHydrated]);

  useEffect(() => {
    if (realtimeHydrated) {
      setItems(realtimeItems as T[]);
    }
  }, [realtimeHydrated, realtimeItems]);

  return { items, setItems };
}
