"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  FolderClosed,
  FolderPlus,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import { PageHero, SectionHeading } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

export interface DriveNode {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  modifiedTime?: string | null;
  webViewLink?: string | null;
  size?: number | null;
  children: DriveNode[];
}

interface DriveFileManagerProps {
  projectKey: string;
  accountEmail: string;
  rootFolderId: string;
  rootWebViewLink?: string | null;
  items: DriveNode[];
}

function folderOptions(nodes: DriveNode[]): DriveNode[] {
  return nodes.flatMap((node) =>
    node.type === "FOLDER"
      ? [node, ...folderOptions(node.children ?? [])]
      : [],
  );
}

function bytes(value?: number | null): string {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function DriveFileManager({
  projectKey,
  accountEmail,
  rootFolderId,
  rootWebViewLink,
  items,
}: DriveFileManagerProps) {
  const router = useRouter();
  const folders = useMemo(() => folderOptions(items), [items]);
  const [folderName, setFolderName] = useState("");
  const [folderParentId, setFolderParentId] = useState(rootFolderId);
  const [uploadParentId, setUploadParentId] = useState(rootFolderId);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createFolder(): Promise<void> {
    if (!folderName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest(
        `/api/integrations/google-drive/projects/${projectKey}/folders`,
        {
          method: "POST",
          body: JSON.stringify({
            name: folderName.trim(),
            parentId: folderParentId,
          }),
        },
      );
      setFolderName("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo folder.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(): Promise<void> {
    if (!uploadFile) return;
    setBusy(true);
    setError(null);
    try {
      const data = new FormData();
      data.append("file", uploadFile);
      data.append("parentId", uploadParentId);
      const response = await fetch(
        `/api/integrations/google-drive/projects/${projectKey}/upload`,
        { method: "POST", body: data },
      );
      const payload = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; problem?: { detailKey?: string } }
        | null;
      if (!response.ok || !payload || payload.ok !== true) {
        throw new Error(
          payload && "problem" in payload
            ? payload.problem?.detailKey ?? "Upload thất bại."
            : "Upload thất bại.",
        );
      }
      setUploadFile(null);
      const input = document.getElementById("drive-upload-file") as HTMLInputElement | null;
      if (input) input.value = "";
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function rename(fileId: string): Promise<void> {
    if (!editingName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest(
        `/api/integrations/google-drive/projects/${projectKey}/items/${fileId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: editingName.trim() }),
        },
      );
      setEditingId(null);
      setEditingName("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đổi tên.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(): Promise<void> {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest(
        `/api/integrations/google-drive/projects/${projectKey}/items/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      setDeleteTarget(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa item.");
    } finally {
      setBusy(false);
    }
  }

  function renderNode(node: DriveNode): React.ReactNode {
    const root = node.id === rootFolderId;
    return (
      <div className="grid gap-2" key={node.id}>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          {node.type === "FOLDER" ? (
            <FolderClosed className="size-5 text-primary" />
          ) : (
            <FileText className="size-5 text-muted-foreground" />
          )}
          <div className="min-w-0">
            {editingId === node.id ? (
              <Input
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                aria-label={`Đổi tên ${node.name}`}
              />
            ) : node.webViewLink ? (
              <a
                className="block truncate font-medium hover:text-primary hover:underline"
                href={node.webViewLink}
                target="_blank"
                rel="noreferrer"
              >
                {node.name}
              </a>
            ) : (
              <strong className="block truncate">{node.name}</strong>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {node.type}
              {node.size ? ` · ${bytes(node.size)}` : ""}
              {node.modifiedTime
                ? ` · ${new Date(node.modifiedTime).toLocaleString("vi-VN")}`
                : ""}
            </p>
          </div>
          {!root ? (
            <div className="col-start-2 flex flex-wrap gap-2 sm:col-start-3">
              {editingId === node.id ? (
                <>
                  <Button size="sm" disabled={busy} onClick={() => void rename(node.id)}>
                    Lưu
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                    Hủy
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(node.id);
                      setEditingName(node.name);
                    }}
                  >
                    <Pencil /> Đổi tên
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => setDeleteTarget({ id: node.id, name: node.name })}
                  >
                    <Trash2 /> Xóa
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </div>
        {node.children?.length ? (
          <div className="ml-5 grid gap-2 border-l pl-4">
            {node.children.map((child) => renderNode(child))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Managed Google Drive"
        title="Project documents"
        description={`Tất cả item nằm trong folder dự án do Tasks Dash tự tạo bằng Google Drive của Workspace Owner (${accountEmail}).`}
        aside={
          rootWebViewLink ? (
            <Button asChild variant="outline">
              <a href={rootWebViewLink} target="_blank" rel="noreferrer">
                <ExternalLink /> Mở trên Drive
              </a>
            </Button>
          ) : null
        }
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <SectionHeading eyebrow="New folder" title="Tạo folder" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="drive-folder-parent">Folder cha</FieldLabel>
              <NativeSelect
                id="drive-folder-parent"
                value={folderParentId}
                onChange={(event) => setFolderParentId(event.target.value)}
              >
                {folders.map((folder) => (
                  <NativeSelectOption value={folder.id} key={folder.id}>{folder.name}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="drive-folder-name">Tên folder</FieldLabel>
              <Input
                id="drive-folder-name"
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                maxLength={180}
              />
            </Field>
            <Button disabled={busy || !folderName.trim()} onClick={() => void createFolder()}>
              <FolderPlus /> Tạo folder trên Drive
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <SectionHeading eyebrow="Upload" title="Upload file" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="drive-upload-parent">Folder đích</FieldLabel>
              <NativeSelect
                id="drive-upload-parent"
                value={uploadParentId}
                onChange={(event) => setUploadParentId(event.target.value)}
              >
                {folders.map((folder) => (
                  <NativeSelectOption value={folder.id} key={folder.id}>{folder.name}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="drive-upload-file">File tối đa 25 MB</FieldLabel>
              <Input
                id="drive-upload-file"
                type="file"
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
            </Field>
            <Button disabled={busy || !uploadFile} onClick={() => void upload()}>
              <Upload /> Upload lên Drive
            </Button>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Google Drive operation failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <SectionHeading eyebrow="Live Drive tree" title="Folder dự án" />
        </CardHeader>
        <CardContent>
          {items.length ? (
            <div className="grid gap-2">{items.map((item) => renderNode(item))}</div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Folder dự án đang trống</EmptyTitle>
                <EmptyDescription>Tạo folder hoặc upload file đầu tiên bên trên.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đưa item vào thùng rác?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name}” sẽ được chuyển vào Google Drive Trash. Project root không thể bị xóa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button variant="destructive" disabled={busy} onClick={() => void remove()}>
              <Trash2 /> Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
