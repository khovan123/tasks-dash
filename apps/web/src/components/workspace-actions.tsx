"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
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
      setError(cause instanceof Error ? cause.message : "Không thể đổi tên workspace.");
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
      setError(cause instanceof Error ? cause.message : "Không thể xóa workspace.");
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
            <Pencil /> Đổi tên
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên workspace</DialogTitle>
            <DialogDescription>
              Tên mới sẽ hiển thị trong dashboard, sidebar và workspace switcher.
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`rename-${workspaceId}`}>Tên workspace</FieldLabel>
            <Input
              id={`rename-${workspaceId}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              autoFocus
            />
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Hủy</Button>
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

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          setConfirmation("");
          setError("");
        }}
      >
        <DialogTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 /> Xóa workspace
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa workspace “{workspaceName}”?</DialogTitle>
            <DialogDescription>
              Thao tác này xóa toàn bộ project, work item, thành viên, automation,
              integration và metadata tài liệu thuộc workspace trong Tasks Dash.
              Không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
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
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Hủy</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={busy || confirmation !== workspaceName}
              onClick={() => void deleteWorkspace()}
            >
              {busy ? "Đang xóa…" : "Xóa vĩnh viễn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
