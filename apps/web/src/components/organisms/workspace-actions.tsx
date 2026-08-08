"use client";

import { useState } from "react";
import { AlertTriangle, Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface DeleteWorkspaceResult {
  requiresWorkspaceSetup: boolean;
  setupUrl?: string;
}

export function WorkspaceActions({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(workspaceName);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function renameWorkspace(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/api/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ workspaceName: name }),
      });
      setRenameOpen(false);
      window.location.reload();
    } catch (cause) {
      setBusy(false);
      setError(
        cause instanceof Error ? cause.message : "Không thể đổi tên workspace.",
      );
    }
  }

  async function deleteWorkspace(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<DeleteWorkspaceResult>(
        `/api/workspaces/${workspaceId}`,
        {
          method: "DELETE",
          body: JSON.stringify({ confirmWorkspaceName: confirmation }),
        },
      );
      if (result.requiresWorkspaceSetup && result.setupUrl) {
        window.location.assign(result.setupUrl);
        return;
      }
      window.location.assign("/workspaces");
    } catch (cause) {
      setBusy(false);
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa workspace.",
      );
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open);
          setError("");
          if (open) setName(workspaceName);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil data-icon="inline-start" /> Đổi tên
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>Đổi tên workspace</DialogTitle>
            <DialogDescription>
              Tên mới sẽ hiển thị trong dashboard, sidebar và workspace
              switcher.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4">
            <Field>
              <FieldLabel htmlFor={`rename-${workspaceId}`}>
                Tên workspace
              </FieldLabel>
              <Input
                id={`rename-${workspaceId}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                autoFocus
              />
            </Field>
            {error ? <FieldError>{error}</FieldError> : null}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4 bg-muted/20">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Hủy
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={busy || name.trim().length < 2}
              onClick={() => void renameWorkspace()}
            >
              {busy ? "Đang lưu…" : "Lưu tên workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          setConfirmation("");
          setError("");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 data-icon="inline-start" /> Xóa workspace
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <AlertTriangle className="text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              Xóa workspace “{workspaceName}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này xóa toàn bộ project, work item, thành viên,
              automation, integration và metadata tài liệu thuộc workspace trong
              Tasks Dash. Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor={`delete-${workspaceId}`}>
              Nhập chính xác <strong>{workspaceName}</strong> để xác nhận
            </FieldLabel>
            <Input
              id={`delete-${workspaceId}`}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy || confirmation !== workspaceName}
              onClick={() => void deleteWorkspace()}
            >
              {busy ? "Đang xóa…" : "Xóa vĩnh viễn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
