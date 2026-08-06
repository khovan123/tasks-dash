"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  Pencil,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import { PageHero, SectionHeading } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface DiscordDocumentFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
}
export interface DiscordDocumentItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  folderId: string | null;
  currentVersion: number;
  updatedAt: string;
  latestVersion: null | {
    version: number;
    fileName: string;
    mimeType: string;
    size: number;
    messageId: string;
    attachmentId: string;
    openInDiscordUrl: string;
    downloadUrl: string;
    createdAt: string;
  };
}
export interface DiscordDocumentTree {
  projectKey: string;
  guildId: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  maxFileSize: number;
  folders: DiscordDocumentFolder[];
  documents: DiscordDocumentItem[];
}

interface FolderOption extends DiscordDocumentFolder {
  depth: number;
}
interface DeleteTarget {
  type: "folder" | "document";
  id: string;
  name: string;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function flattenFolders(folders: DiscordDocumentFolder[]): FolderOption[] {
  const byParent = new Map<string, DiscordDocumentFolder[]>();
  for (const folder of folders) {
    const parent = folder.parentFolderId ?? "";
    byParent.set(parent, [...(byParent.get(parent) ?? []), folder]);
  }
  const result: FolderOption[] = [];
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

async function multipartRequest(path: string, data: FormData): Promise<void> {
  const response = await fetch(path, { method: "POST", body: data });
  const payload = (await response.json().catch(() => null)) as
    { ok: true } | { ok: false; problem?: { detailKey?: string } } | null;
  if (!response.ok || !payload || payload.ok !== true) {
    throw new Error(
      payload && "problem" in payload
        ? (payload.problem?.detailKey ?? "Upload thất bại.")
        : "Upload thất bại.",
    );
  }
}

export function DiscordDocumentManager({
  tree,
  canManageDocuments,
}: {
  tree: DiscordDocumentTree;
  canManageDocuments: boolean;
}) {
  const router = useRouter();
  const folderOptions = useMemo(
    () => flattenFolders(tree.folders),
    [tree.folders],
  );
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [versionFiles, setVersionFiles] = useState<Record<string, File | null>>(
    {},
  );
  const [editingFolder, setEditingFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingDocument, setEditingDocument] =
    useState<DiscordDocumentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleDocuments = tree.documents.filter(
    (document) => (document.folderId ?? "") === selectedFolderId,
  );

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Thao tác tài liệu thất bại.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createFolder(): Promise<void> {
    if (!folderName.trim()) return;
    await run(async () => {
      await apiRequest(`/api/projects/${tree.projectKey}/documents/folders`, {
        method: "POST",
        body: JSON.stringify({
          name: folderName.trim(),
          parentFolderId: selectedFolderId || undefined,
        }),
      });
      setFolderName("");
    });
  }

  async function saveFolder(): Promise<void> {
    if (!editingFolder?.name.trim()) return;
    await run(async () => {
      await apiRequest(
        `/api/projects/${tree.projectKey}/documents/folders/${editingFolder.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: editingFolder.name.trim() }),
        },
      );
      setEditingFolder(null);
    });
  }

  async function uploadDocument(): Promise<void> {
    if (!uploadFile) return;
    await run(async () => {
      const data = new FormData();
      data.append("file", uploadFile);
      if (uploadName.trim()) data.append("name", uploadName.trim());
      if (selectedFolderId) data.append("folderId", selectedFolderId);
      if (uploadDescription.trim())
        data.append("description", uploadDescription.trim());
      if (uploadTags.trim()) data.append("tags", uploadTags.trim());
      await multipartRequest(
        `/api/projects/${tree.projectKey}/documents/upload`,
        data,
      );
      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");
      setUploadTags("");
      const input = document.getElementById(
        "discord-doc-upload",
      ) as HTMLInputElement | null;
      if (input) input.value = "";
    });
  }

  async function uploadVersion(documentId: string): Promise<void> {
    const file = versionFiles[documentId];
    if (!file) return;
    await run(async () => {
      const data = new FormData();
      data.append("file", file);
      await multipartRequest(
        `/api/projects/${tree.projectKey}/documents/${documentId}/versions`,
        data,
      );
      setVersionFiles((current) => ({ ...current, [documentId]: null }));
    });
  }

  async function saveDocument(): Promise<void> {
    if (!editingDocument?.name.trim()) return;
    await run(async () => {
      await apiRequest(
        `/api/projects/${tree.projectKey}/documents/${editingDocument.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: editingDocument.name.trim(),
            description: editingDocument.description,
            folderId: editingDocument.folderId ?? "",
            tags: editingDocument.tags,
          }),
        },
      );
      setEditingDocument(null);
    });
  }

  async function removeTarget(): Promise<void> {
    if (!deleteTarget) return;
    await run(async () => {
      const path =
        deleteTarget.type === "folder"
          ? `/api/projects/${tree.projectKey}/documents/folders/${deleteTarget.id}`
          : `/api/projects/${tree.projectKey}/documents/${deleteTarget.id}`;
      await apiRequest(path, { method: "DELETE" });
      if (
        deleteTarget.type === "folder" &&
        selectedFolderId === deleteTarget.id
      ) {
        setSelectedFolderId("");
      }
      setDeleteTarget(null);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Discord document storage"
        title={`${tree.projectKey} Documents`}
        description="Metadata được quản lý; file được lưu dưới dạng Discord attachment."
        aside={
          <Button asChild variant="outline">
            <a href={tree.channelUrl} target="_blank" rel="noreferrer">
              <ExternalLink data-icon="inline-start" /> Mở #{tree.channelName}
            </a>
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Document operation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <SectionHeading eyebrow="Virtual folders" title="Cấu trúc folder" />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              className="w-full justify-start"
              variant={selectedFolderId === "" ? "secondary" : "ghost"}
              onClick={() => setSelectedFolderId("")}
            >
              <Folder /> Task Dash - {tree.projectKey}
            </Button>
            <div className="grid gap-1">
              {folderOptions.map((folder) => (
                <div key={folder.id} style={{ paddingLeft: folder.depth * 14 }}>
                  {editingFolder?.id === folder.id ? (
                    <div className="flex gap-1">
                      <Input
                        value={editingFolder.name}
                        onChange={(event) =>
                          setEditingFolder({
                            ...editingFolder,
                            name: event.target.value,
                          })
                        }
                      />
                      <Button
                        size="icon-sm"
                        disabled={busy || !canManageDocuments}
                        onClick={() => void saveFolder()}
                      >
                        <Save />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Button
                        className="min-w-0 flex-1 justify-start truncate"
                        variant={
                          selectedFolderId === folder.id ? "secondary" : "ghost"
                        }
                        onClick={() => setSelectedFolderId(folder.id)}
                      >
                        <Folder />{" "}
                        <span className="truncate">{folder.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canManageDocuments}
                        onClick={() =>
                          setEditingFolder({ id: folder.id, name: folder.name })
                        }
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canManageDocuments}
                        onClick={() =>
                          setDeleteTarget({
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
            {canManageDocuments && (
              <>
                <Field>
                  <FieldLabel htmlFor="new-folder-name">
                    Folder mới trong vị trí đang chọn
                  </FieldLabel>
                  <Input
                    id="new-folder-name"
                    value={folderName}
                    disabled={!canManageDocuments}
                    onChange={(event) => setFolderName(event.target.value)}
                    placeholder="Requirements"
                  />
                </Field>
                <Button
                  className="w-full"
                  disabled={busy || !folderName.trim() || !canManageDocuments}
                  onClick={() => void createFolder()}
                >
                  <FolderPlus data-icon="inline-start" /> Tạo folder
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          {canManageDocuments && (
            <Card>
              <CardHeader>
                <SectionHeading
                  eyebrow="Upload attachment"
                  title="Thêm tài liệu"
                />
              </CardHeader>
              <CardContent className="grid gap-4">
                <Field>
                  <FieldLabel htmlFor="discord-doc-upload">
                    File tối đa {formatBytes(tree.maxFileSize)}
                  </FieldLabel>
                  <Input
                    id="discord-doc-upload"
                    type="file"
                    disabled={!canManageDocuments}
                    onChange={(event) =>
                      setUploadFile(event.target.files?.[0] ?? null)
                    }
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>Tên hiển thị</FieldLabel>
                    <Input
                      value={uploadName}
                      disabled={!canManageDocuments}
                      onChange={(event) => setUploadName(event.target.value)}
                      placeholder={uploadFile?.name ?? "Tên tài liệu"}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Tags</FieldLabel>
                    <Input
                      value={uploadTags}
                      disabled={!canManageDocuments}
                      onChange={(event) => setUploadTags(event.target.value)}
                      placeholder="srs, approved, v1"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel>Mô tả</FieldLabel>
                  <Textarea
                    value={uploadDescription}
                    disabled={!canManageDocuments}
                    onChange={(event) => setUploadDescription(event.target.value)}
                  />
                </Field>
                <FieldDescription>
                  File sẽ được gửi vào #{tree.channelName}; Tasks Dash lưu message
                  ID và attachment ID để tải lại hoặc mở đúng message.
                </FieldDescription>
                <Button
                  className="w-fit"
                  disabled={busy || !uploadFile || !canManageDocuments}
                  onClick={() => void uploadDocument()}
                >
                  <Upload data-icon="inline-start" /> Upload lên Discord
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Current folder"
                title="Tài liệu"
                meta={`${visibleDocuments.length} files`}
              />
            </CardHeader>
            <CardContent>
              {visibleDocuments.length === 0 ? (
                <Empty>
                  <FileText className="size-10 text-primary" />
                  <EmptyHeader>
                    <EmptyTitle>Folder chưa có tài liệu</EmptyTitle>
                    <EmptyDescription>
                      Upload file đầu tiên bằng form phía trên.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-4">
                  {visibleDocuments.map((documentItem) => (
                    <article
                      className="rounded-xl border p-4"
                      key={documentItem.id}
                    >
                      {editingDocument?.id === documentItem.id ? (
                        <div className="grid gap-3">
                          <Field>
                            <FieldLabel>Tên</FieldLabel>
                            <Input
                              value={editingDocument.name}
                              disabled={!canManageDocuments}
                              onChange={(event) =>
                                setEditingDocument({
                                  ...editingDocument,
                                  name: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field>
                            <FieldLabel>Folder</FieldLabel>
                            <Select
                              value={editingDocument.folderId ?? "root_folder"}
                              disabled={!canManageDocuments}
                              onValueChange={(val) =>
                                setEditingDocument({
                                  ...editingDocument,
                                  folderId: val === "root_folder" ? null : val,
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Root" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="root_folder">
                                  Root
                                </SelectItem>
                                {folderOptions.map((folder) => (
                                  <SelectItem key={folder.id} value={folder.id}>
                                    {"—".repeat(folder.depth)} {folder.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field>
                            <FieldLabel>Mô tả</FieldLabel>
                            <Textarea
                              value={editingDocument.description}
                              disabled={!canManageDocuments}
                              onChange={(event) =>
                                setEditingDocument({
                                  ...editingDocument,
                                  description: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field>
                            <FieldLabel>
                              Tags, phân tách bằng dấu phẩy
                            </FieldLabel>
                            <Input
                              value={editingDocument.tags.join(", ")}
                              disabled={!canManageDocuments}
                              onChange={(event) =>
                                setEditingDocument({
                                  ...editingDocument,
                                  tags: event.target.value
                                    .split(",")
                                    .map((tag) => tag.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          </Field>
                          <div className="flex gap-2">
                            <Button
                              disabled={busy || !canManageDocuments}
                              onClick={() => void saveDocument()}
                            >
                              <Save data-icon="inline-start" /> Lưu
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setEditingDocument(null)}
                            >
                              Hủy
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold">
                                {documentItem.name}
                              </h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {documentItem.description ||
                                  documentItem.latestVersion?.fileName}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {documentItem.tags.map((tag) => (
                                  <Badge variant="secondary" key={tag}>
                                    {tag}
                                  </Badge>
                                ))}
                                <Badge variant="purple">
                                  v{documentItem.currentVersion}
                                </Badge>
                                {documentItem.latestVersion ? (
                                  <Badge variant="outline">
                                    {formatBytes(
                                      documentItem.latestVersion.size,
                                    )}
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {documentItem.latestVersion ? (
                                <>
                                  <Button asChild variant="outline" size="sm">
                                    <a
                                      href={
                                        documentItem.latestVersion.downloadUrl
                                      }
                                      target="_blank"
                                    >
                                      <Download data-icon="inline-start" /> Tải
                                      file
                                    </a>
                                  </Button>
                                  <Button asChild variant="outline" size="sm">
                                    <a
                                      href={
                                        documentItem.latestVersion
                                          .openInDiscordUrl
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <ExternalLink data-icon="inline-start" />{" "}
                                      Mở trong Discord
                                    </a>
                                  </Button>
                                </>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={!canManageDocuments}
                                onClick={() =>
                                  setEditingDocument({ ...documentItem })
                                }
                              >
                                <Pencil data-icon="inline-start" /> Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={!canManageDocuments}
                                onClick={() =>
                                  setDeleteTarget({
                                    type: "document",
                                    id: documentItem.id,
                                    name: documentItem.name,
                                  })
                                }
                              >
                                <Trash2 data-icon="inline-start" /> Xóa
                              </Button>
                            </div>
                          </div>
                          {canManageDocuments && (
                            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center">
                              <Input
                                type="file"
                                disabled={!canManageDocuments}
                                onChange={(event) =>
                                  setVersionFiles((current) => ({
                                    ...current,
                                    [documentItem.id]:
                                      event.target.files?.[0] ?? null,
                                  }))
                                }
                              />
                              <Button
                                variant="secondary"
                                disabled={
                                  busy ||
                                  !versionFiles[documentItem.id] ||
                                  !canManageDocuments
                                }
                                onClick={() =>
                                  void uploadVersion(documentItem.id)
                                }
                              >
                                <FilePlus2 data-icon="inline-start" /> Upload
                                version mới
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Xóa {deleteTarget?.type === "folder" ? "folder" : "tài liệu"}?
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "folder"
                ? `Folder “${deleteTarget?.name}” chỉ được xóa khi đang trống.`
                : `Mọi version của “${deleteTarget?.name}” sẽ bị xóa khỏi Discord và MongoDB.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !canManageDocuments}
              onClick={() => void removeTarget()}
            >
              <Trash2 data-icon="inline-start" /> Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
