"use client";

import { useEffect, useMemo } from "react";
import {
  DiscordDocumentManager,
  type DiscordDocumentTree,
} from "@/components/discord-document-manager";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  replaceDocumentTree,
  selectDocumentTree,
  type RealtimeDocumentTree,
} from "@/lib/store/realtime-slice";

export function RealtimeDiscordDocumentManager({
  initialTree,
  canManageDocuments,
}: {
  initialTree: DiscordDocumentTree;
  canManageDocuments: boolean;
}) {
  const dispatch = useAppDispatch();
  const treeSelector = useMemo(
    () => selectDocumentTree(initialTree.projectKey),
    [initialTree.projectKey],
  );
  const realtimeTree = useAppSelector(treeSelector);

  useEffect(() => {
    dispatch(replaceDocumentTree(initialTree as RealtimeDocumentTree));
  }, [dispatch, initialTree]);

  return (
    <DiscordDocumentManager
      tree={(realtimeTree ?? initialTree) as DiscordDocumentTree}
      canManageDocuments={canManageDocuments}
    />
  );
}
