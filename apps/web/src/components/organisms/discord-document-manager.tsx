"use client";

import { ExternalLink } from "lucide-react";
import { DocumentDeleteDialog } from "@/components/organisms/document-delete-dialog";
import { DocumentFolderSidebar } from "@/components/organisms/document-folder-sidebar";
import { DocumentListPanel } from "@/components/organisms/document-list-panel";
import { DocumentUploadPanel } from "@/components/organisms/document-upload-panel";
import { PageHero } from "@/components/organisms/page-hero";
import { useDocumentManager } from "@/features/documents/hooks/use-document-manager";
import type { DiscordDocumentTree } from "@/features/documents/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DiscordDocumentManager({
  tree,
  canManageDocuments,
}: {
  tree: DiscordDocumentTree;
  canManageDocuments: boolean;
}) {
  const manager = useDocumentManager(tree);

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

      {manager.error ? (
        <Alert variant="destructive">
          <AlertTitle>Document operation failed</AlertTitle>
          <AlertDescription>{manager.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <DocumentFolderSidebar
          projectKey={tree.projectKey}
          folders={manager.folderOptions}
          selectedFolderId={manager.selectedFolderId}
          onSelectFolder={manager.setSelectedFolderId}
          editingFolder={manager.editingFolder}
          onEditingFolderChange={manager.setEditingFolder}
          folderName={manager.folderName}
          onFolderNameChange={manager.setFolderName}
          onCreateFolder={() => void manager.createFolder()}
          onSaveFolder={() => void manager.saveFolder()}
          onDeleteTarget={manager.setDeleteTarget}
          busy={manager.busy}
          canManage={canManageDocuments}
        />

        <div className="flex flex-col gap-5">
          {canManageDocuments ? (
            <DocumentUploadPanel
              channelName={tree.channelName}
              maxFileSize={tree.maxFileSize}
              file={manager.uploadFile}
              name={manager.uploadName}
              description={manager.uploadDescription}
              tags={manager.uploadTags}
              inputRef={manager.uploadInputRef}
              busy={manager.busy}
              onFileChange={manager.setUploadFile}
              onNameChange={manager.setUploadName}
              onDescriptionChange={manager.setUploadDescription}
              onTagsChange={manager.setUploadTags}
              onUpload={() => void manager.uploadDocument()}
            />
          ) : null}

          <DocumentListPanel
            documents={manager.visibleDocuments}
            folderOptions={manager.folderOptions}
            editingDocument={manager.editingDocument}
            versionFiles={manager.versionFiles}
            busy={manager.busy}
            canManage={canManageDocuments}
            onEditingDocumentChange={manager.setEditingDocument}
            onEditingTagsChange={manager.updateEditingDocumentTags}
            onVersionFileChange={(documentId, file) =>
              manager.setVersionFiles((current) => ({
                ...current,
                [documentId]: file,
              }))
            }
            onSaveDocument={() => void manager.saveDocument()}
            onUploadVersion={(documentId) => void manager.uploadVersion(documentId)}
            onDeleteTarget={manager.setDeleteTarget}
          />
        </div>
      </section>

      <DocumentDeleteDialog
        target={manager.deleteTarget}
        busy={manager.busy}
        onOpenChange={(open) => !open && manager.setDeleteTarget(null)}
        onDelete={() => void manager.removeTarget()}
      />
    </div>
  );
}
