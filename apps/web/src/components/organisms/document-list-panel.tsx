"use client";

import { Download, ExternalLink, FilePlus2, FileText, Pencil, Save, Trash2 } from "lucide-react";
import { SectionHeading } from "@/components/molecules/section-heading";
import { formatBytes, type DocumentFolderOption } from "@/features/documents/lib/document-tree";
import type {
  DiscordDocumentItem,
  DocumentDeleteTarget,
} from "@/features/documents/types";
import { serializeCommaSeparatedValues } from "@/lib/text-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function DocumentListPanel({
  documents,
  folderOptions,
  editingDocument,
  versionFiles,
  busy,
  canManage,
  onEditingDocumentChange,
  onEditingTagsChange,
  onVersionFileChange,
  onSaveDocument,
  onUploadVersion,
  onDeleteTarget,
}: {
  documents: DiscordDocumentItem[];
  folderOptions: DocumentFolderOption[];
  editingDocument: DiscordDocumentItem | null;
  versionFiles: Record<string, File | null>;
  busy: boolean;
  canManage: boolean;
  onEditingDocumentChange: (document: DiscordDocumentItem | null) => void;
  onEditingTagsChange: (value: string) => void;
  onVersionFileChange: (documentId: string, file: File | null) => void;
  onSaveDocument: () => void;
  onUploadVersion: (documentId: string) => void;
  onDeleteTarget: (target: DocumentDeleteTarget) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <SectionHeading
          eyebrow="Current folder"
          title="Tài liệu"
          meta={`${documents.length} files`}
        />
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <Empty>
            <FileText className="size-10 text-primary" />
            <EmptyHeader>
              <EmptyTitle>Folder chưa có tài liệu</EmptyTitle>
              <EmptyDescription>
                {canManage
                  ? "Upload file đầu tiên bằng form phía trên."
                  : "Chưa có tài liệu trong folder này."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4">
            {documents.map((documentItem) => (
              <article className="rounded-xl border p-4" key={documentItem.id}>
                {editingDocument?.id === documentItem.id ? (
                  <div className="grid gap-3">
                    <Field>
                      <FieldLabel>Tên</FieldLabel>
                      <Input
                        value={editingDocument.name}
                        onChange={(event) =>
                          onEditingDocumentChange({
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
                        onValueChange={(value) =>
                          onEditingDocumentChange({
                            ...editingDocument,
                            folderId: value === "root_folder" ? null : value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Root" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="root_folder">Root</SelectItem>
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
                        onChange={(event) =>
                          onEditingDocumentChange({
                            ...editingDocument,
                            description: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Tags, phân tách bằng dấu phẩy</FieldLabel>
                      <Input
                        value={serializeCommaSeparatedValues(editingDocument.tags)}
                        onChange={(event) => onEditingTagsChange(event.target.value)}
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button disabled={busy} onClick={onSaveDocument}>
                        <Save data-icon="inline-start" /> Lưu
                      </Button>
                      <Button variant="ghost" onClick={() => onEditingDocumentChange(null)}>
                        Hủy
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{documentItem.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {documentItem.description || documentItem.latestVersion?.fileName}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {documentItem.tags.map((tag) => (
                            <Badge variant="secondary" key={tag}>
                              {tag}
                            </Badge>
                          ))}
                          <Badge variant="purple">v{documentItem.currentVersion}</Badge>
                          {documentItem.latestVersion ? (
                            <Badge variant="outline">
                              {formatBytes(documentItem.latestVersion.size)}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {documentItem.latestVersion ? (
                          <>
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={documentItem.latestVersion.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Download data-icon="inline-start" /> Tải file
                              </a>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={documentItem.latestVersion.openInDiscordUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink data-icon="inline-start" /> Mở trong Discord
                              </a>
                            </Button>
                          </>
                        ) : null}
                        {canManage ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditingDocumentChange({ ...documentItem })}
                            >
                              <Pencil data-icon="inline-start" /> Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                onDeleteTarget({
                                  type: "document",
                                  id: documentItem.id,
                                  name: documentItem.name,
                                })
                              }
                            >
                              <Trash2 data-icon="inline-start" /> Xóa
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {canManage ? (
                      <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-center">
                        <Input
                          type="file"
                          onChange={(event) =>
                            onVersionFileChange(
                              documentItem.id,
                              event.target.files?.[0] ?? null,
                            )
                          }
                        />
                        <Button
                          variant="secondary"
                          disabled={busy || !versionFiles[documentItem.id]}
                          onClick={() => onUploadVersion(documentItem.id)}
                        >
                          <FilePlus2 data-icon="inline-start" /> Upload version mới
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
