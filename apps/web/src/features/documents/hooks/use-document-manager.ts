"use client";

import { useMemo, useRef, useState } from "react";
import type {
  DiscordDocumentItem,
  DiscordDocumentTree,
  DocumentDeleteTarget,
} from "@/features/documents/types";
import {
  flattenDocumentFolders,
} from "@/features/documents/lib/document-tree";
import { uploadMultipart } from "@/features/documents/lib/multipart";
import { apiRequest } from "@/lib/api/api-request";
import { mutationErrorMessage } from "@/lib/api/mutation-result";
import { parseCommaSeparatedValues } from "@/lib/text-list";
import { useAppDispatch } from "@/lib/store/hooks";
import {
  replaceDocumentTree,
  type RealtimeDocumentTree,
} from "@/lib/store/realtime-slice";

export function useDocumentManager(tree: DiscordDocumentTree) {
  const dispatch = useAppDispatch();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [folderName, setFolderName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [versionFiles, setVersionFiles] = useState<Record<string, File | null>>({});
  const [editingFolder, setEditingFolder] = useState<{ id: string; name: string } | null>(null);
  const [editingDocument, setEditingDocument] = useState<DiscordDocumentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentDeleteTarget | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folderOptions = useMemo(
    () => flattenDocumentFolders(tree.folders),
    [tree.folders],
  );
  const visibleDocuments = tree.documents.filter(
    (document) => (document.folderId ?? "") === selectedFolderId,
  );

  async function syncTree(): Promise<void> {
    const nextTree = await apiRequest<RealtimeDocumentTree>(
      `/api/projects/${tree.projectKey}/documents`,
    );
    dispatch(replaceDocumentTree(nextTree));
  }

  async function run(action: () => Promise<void>, fallback: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      await syncTree();
      return true;
    } catch (cause) {
      setError(mutationErrorMessage(cause, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createFolder(): Promise<void> {
    const name = folderName.trim();
    if (!name) return;
    const ok = await run(async () => {
      await apiRequest(`/api/projects/${tree.projectKey}/documents/folders`, {
        method: "POST",
        body: JSON.stringify({
          name,
          parentFolderId: selectedFolderId || undefined,
        }),
      });
    }, "Không thể tạo folder.");
    if (ok) setFolderName("");
  }

  async function saveFolder(): Promise<void> {
    if (!editingFolder?.name.trim()) return;
    const current = editingFolder;
    const ok = await run(async () => {
      await apiRequest(
        `/api/projects/${tree.projectKey}/documents/folders/${current.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name: current.name.trim() }),
        },
      );
    }, "Không thể đổi tên folder.");
    if (ok) setEditingFolder(null);
  }

  async function uploadDocument(): Promise<void> {
    if (!uploadFile) return;
    const file = uploadFile;
    const ok = await run(async () => {
      const data = new FormData();
      data.append("file", file);
      if (uploadName.trim()) data.append("name", uploadName.trim());
      if (selectedFolderId) data.append("folderId", selectedFolderId);
      if (uploadDescription.trim()) data.append("description", uploadDescription.trim());
      if (uploadTags.trim()) data.append("tags", uploadTags.trim());
      await uploadMultipart(`/api/projects/${tree.projectKey}/documents/upload`, data);
    }, "Không thể upload tài liệu.");

    if (ok) {
      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");
      setUploadTags("");
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }

  async function uploadVersion(documentId: string): Promise<void> {
    const file = versionFiles[documentId];
    if (!file) return;
    const ok = await run(async () => {
      const data = new FormData();
      data.append("file", file);
      await uploadMultipart(
        `/api/projects/${tree.projectKey}/documents/${documentId}/versions`,
        data,
      );
    }, "Không thể upload version mới.");
    if (ok) {
      setVersionFiles((current) => ({ ...current, [documentId]: null }));
    }
  }

  async function saveDocument(): Promise<void> {
    if (!editingDocument?.name.trim()) return;
    const current = editingDocument;
    const ok = await run(async () => {
      await apiRequest(`/api/projects/${tree.projectKey}/documents/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: current.name.trim(),
          description: current.description,
          folderId: current.folderId ?? "",
          tags: current.tags,
        }),
      });
    }, "Không thể cập nhật tài liệu.");
    if (ok) setEditingDocument(null);
  }

  async function removeTarget(): Promise<void> {
    if (!deleteTarget) return;
    const current = deleteTarget;
    const ok = await run(async () => {
      const path =
        current.type === "folder"
          ? `/api/projects/${tree.projectKey}/documents/folders/${current.id}`
          : `/api/projects/${tree.projectKey}/documents/${current.id}`;
      await apiRequest(path, { method: "DELETE" });
    }, "Không thể xóa tài liệu hoặc folder.");

    if (ok) {
      if (current.type === "folder" && selectedFolderId === current.id) {
        setSelectedFolderId("");
      }
      setDeleteTarget(null);
    }
  }

  function updateEditingDocumentTags(value: string): void {
    if (!editingDocument) return;
    setEditingDocument({
      ...editingDocument,
      tags: parseCommaSeparatedValues(value),
    });
  }

  return {
    busy,
    createFolder,
    deleteTarget,
    editingDocument,
    editingFolder,
    error,
    folderName,
    folderOptions,
    removeTarget,
    saveDocument,
    saveFolder,
    selectedFolderId,
    setDeleteTarget,
    setEditingDocument,
    setEditingFolder,
    setFolderName,
    setSelectedFolderId,
    setUploadDescription,
    setUploadFile,
    setUploadName,
    setUploadTags,
    setVersionFiles,
    updateEditingDocumentTags,
    uploadDescription,
    uploadFile,
    uploadInputRef,
    uploadName,
    uploadTags,
    uploadDocument,
    uploadVersion,
    versionFiles,
    visibleDocuments,
  };
}
