"use client";

import { Folder, FolderPlus, Pencil, Save, Trash2 } from "lucide-react";
import { SectionHeading } from "@/components/molecules/section-heading";
import type { DocumentFolderOption } from "@/features/documents/lib/document-tree";
import type { DocumentDeleteTarget } from "@/features/documents/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function DocumentFolderSidebar({
  projectKey,
  folders,
  selectedFolderId,
  onSelectFolder,
  editingFolder,
  onEditingFolderChange,
  folderName,
  onFolderNameChange,
  onCreateFolder,
  onSaveFolder,
  onDeleteTarget,
  busy,
  canManage,
}: {
  projectKey: string;
  folders: DocumentFolderOption[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  editingFolder: { id: string; name: string } | null;
  onEditingFolderChange: (folder: { id: string; name: string } | null) => void;
  folderName: string;
  onFolderNameChange: (value: string) => void;
  onCreateFolder: () => void;
  onSaveFolder: () => void;
  onDeleteTarget: (target: DocumentDeleteTarget) => void;
  busy: boolean;
  canManage: boolean;
}) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <SectionHeading eyebrow="Virtual folders" title="Cấu trúc folder" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          className="w-full justify-start"
          variant={selectedFolderId === "" ? "secondary" : "ghost"}
          onClick={() => onSelectFolder("")}
        >
          <Folder /> Task Dash - {projectKey}
        </Button>
        <div className="grid gap-1">
          {folders.map((folder) => (
            <div key={folder.id} style={{ paddingLeft: folder.depth * 14 }}>
              {editingFolder?.id === folder.id ? (
                <div className="flex gap-1">
                  <Input
                    value={editingFolder.name}
                    onChange={(event) =>
                      onEditingFolderChange({
                        ...editingFolder,
                        name: event.target.value,
                      })
                    }
                  />
                  <Button
                    size="icon-sm"
                    disabled={busy || !canManage}
                    onClick={onSaveFolder}
                  >
                    <Save />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    className="min-w-0 flex-1 justify-start truncate"
                    variant={selectedFolderId === folder.id ? "secondary" : "ghost"}
                    onClick={() => onSelectFolder(folder.id)}
                  >
                    <Folder /> <span className="truncate">{folder.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canManage}
                    onClick={() =>
                      onEditingFolderChange({ id: folder.id, name: folder.name })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!canManage}
                    onClick={() =>
                      onDeleteTarget({
                        type: "folder",
                        id: folder.id,
                        name: folder.name,
                      })
                    }
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {canManage ? (
          <>
            <Field>
              <FieldLabel htmlFor="new-folder-name">
                Folder mới trong vị trí đang chọn
              </FieldLabel>
              <Input
                id="new-folder-name"
                value={folderName}
                onChange={(event) => onFolderNameChange(event.target.value)}
                placeholder="Requirements"
              />
            </Field>
            <Button
              className="w-full"
              disabled={busy || !folderName.trim()}
              onClick={onCreateFolder}
            >
              <FolderPlus data-icon="inline-start" /> Tạo folder
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
