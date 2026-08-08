"use client";

import { useEffect, useMemo } from "react";
import type { DiscordDocumentTree } from "@/features/documents/types";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  replaceDocumentTree,
  selectDocumentTree,
  type RealtimeDocumentTree,
} from "@/lib/store/realtime-slice";

export function useRealtimeDocumentTree(
  initialTree: DiscordDocumentTree,
): DiscordDocumentTree {
  const dispatch = useAppDispatch();
  const selector = useMemo(
    () => selectDocumentTree(initialTree.projectKey),
    [initialTree.projectKey],
  );
  const realtimeTree = useAppSelector(selector);

  useEffect(() => {
    dispatch(replaceDocumentTree(initialTree as RealtimeDocumentTree));
  }, [dispatch, initialTree]);

  return (realtimeTree ?? initialTree) as DiscordDocumentTree;
}
