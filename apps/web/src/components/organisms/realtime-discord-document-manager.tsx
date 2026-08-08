"use client";

import { DiscordDocumentManager } from "@/components/organisms/discord-document-manager";
import { useRealtimeDocumentTree } from "@/features/documents/hooks/use-realtime-document-tree";
import type { DiscordDocumentTree } from "@/features/documents/types";

export function RealtimeDiscordDocumentManager({
  initialTree,
  canManageDocuments,
}: {
  initialTree: DiscordDocumentTree;
  canManageDocuments: boolean;
}) {
  const tree = useRealtimeDocumentTree(initialTree);

  return (
    <DiscordDocumentManager
      tree={tree}
      canManageDocuments={canManageDocuments}
    />
  );
}
