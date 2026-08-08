import type { DiscordDocumentFolder } from "@/features/documents/types";

export interface DocumentFolderOption extends DiscordDocumentFolder {
  depth: number;
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function flattenDocumentFolders(
  folders: DiscordDocumentFolder[],
): DocumentFolderOption[] {
  const byParent = new Map<string, DiscordDocumentFolder[]>();
  for (const folder of folders) {
    const parent = folder.parentFolderId ?? "";
    byParent.set(parent, [...(byParent.get(parent) ?? []), folder]);
  }

  const result: DocumentFolderOption[] = [];
  const walk = (parentId: string, depth: number, seen: Set<string>) => {
    for (const folder of (byParent.get(parentId) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (seen.has(folder.id)) continue;
      seen.add(folder.id);
      result.push({ ...folder, depth });
      walk(folder.id, depth + 1, seen);
    }
  };

  walk("", 0, new Set());
  return result;
}
