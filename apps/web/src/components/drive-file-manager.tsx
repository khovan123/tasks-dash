"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiRequest } from "@/lib/api/api-request";

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
      const input = document.getElementById(
        "drive-upload-file",
      ) as HTMLInputElement | null;
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

  async function remove(fileId: string, name: string): Promise<void> {
    if (!window.confirm(`Đưa “${name}” vào thùng rác Google Drive?`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest(
        `/api/integrations/google-drive/projects/${projectKey}/items/${fileId}`,
        { method: "DELETE" },
      );
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa item.");
    } finally {
      setBusy(false);
    }
  }

  function renderNode(node: DriveNode, depth = 0): React.ReactNode {
    const root = node.id === rootFolderId;
    return (
      <div key={node.id}>
        <div className="drive-row" style={{ paddingLeft: 14 + depth * 22 }}>
          <span className="drive-icon">{node.type === "FOLDER" ? "📁" : "📄"}</span>
          <div className="drive-main">
            {editingId === node.id ? (
              <input
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                aria-label={`Đổi tên ${node.name}`}
              />
            ) : node.webViewLink ? (
              <a href={node.webViewLink} target="_blank" rel="noreferrer">
                {node.name}
              </a>
            ) : (
              <strong>{node.name}</strong>
            )}
            <span>
              {node.type}
              {node.size ? ` · ${bytes(node.size)}` : ""}
              {node.modifiedTime
                ? ` · ${new Date(node.modifiedTime).toLocaleString("vi-VN")}`
                : ""}
            </span>
          </div>
          {!root ? (
            <div className="drive-actions">
              {editingId === node.id ? (
                <>
                  <button
                    className="secondary compact"
                    disabled={busy}
                    onClick={() => void rename(node.id)}
                  >
                    Lưu
                  </button>
                  <button
                    className="ghost compact"
                    onClick={() => setEditingId(null)}
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="secondary compact"
                    onClick={() => {
                      setEditingId(node.id);
                      setEditingName(node.name);
                    }}
                  >
                    Đổi tên
                  </button>
                  <button
                    className="danger-button"
                    disabled={busy}
                    onClick={() => void remove(node.id, node.name)}
                  >
                    Xóa
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        {node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <>
      <section className="hero-panel">
        <div>
          <span className="eyebrow">MANAGED GOOGLE DRIVE</span>
          <h1>Project documents</h1>
          <p>
            Tất cả item nằm trong folder dự án do Tasks Dash tự tạo bằng Google
            Drive của Workspace Owner ({accountEmail}).
          </p>
        </div>
        {rootWebViewLink ? (
          <a
            className="secondary link-button"
            href={rootWebViewLink}
            target="_blank"
            rel="noreferrer"
          >
            Mở trên Drive
          </a>
        ) : null}
      </section>

      <section className="drive-toolbar">
        <article className="form-card">
          <div className="section-heading">
            <div><span>NEW FOLDER</span><h2>Tạo folder</h2></div>
          </div>
          <label>
            Folder cha
            <select
              value={folderParentId}
              onChange={(event) => setFolderParentId(event.target.value)}
            >
              {folders.map((folder) => (
                <option value={folder.id} key={folder.id}>{folder.name}</option>
              ))}
            </select>
          </label>
          <label>
            Tên folder
            <input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              maxLength={180}
            />
          </label>
          <button
            className="primary"
            disabled={busy || !folderName.trim()}
            onClick={() => void createFolder()}
          >
            Tạo folder trên Drive
          </button>
        </article>

        <article className="form-card">
          <div className="section-heading">
            <div><span>UPLOAD</span><h2>Upload file</h2></div>
          </div>
          <label>
            Folder đích
            <select
              value={uploadParentId}
              onChange={(event) => setUploadParentId(event.target.value)}
            >
              {folders.map((folder) => (
                <option value={folder.id} key={folder.id}>{folder.name}</option>
              ))}
            </select>
          </label>
          <label>
            File tối đa 25 MB
            <input
              id="drive-upload-file"
              type="file"
              onChange={(event) =>
                setUploadFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
          <button
            className="primary"
            disabled={busy || !uploadFile}
            onClick={() => void upload()}
          >
            Upload lên Drive
          </button>
        </article>
      </section>

      {error ? <p className="error data-card">{error}</p> : null}
      <section className="data-card">
        <div className="section-heading">
          <div><span>LIVE DRIVE TREE</span><h2>Folder dự án</h2></div>
        </div>
        <div className="drive-tree">{items.map((item) => renderNode(item))}</div>
      </section>
    </>
  );
}
