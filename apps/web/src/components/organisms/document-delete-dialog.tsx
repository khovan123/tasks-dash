"use client";

import { Trash2 } from "lucide-react";
import type { DocumentDeleteTarget } from "@/features/documents/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DocumentDeleteDialog({
  target,
  busy,
  onOpenChange,
  onDelete,
}: {
  target: DocumentDeleteTarget | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Xóa {target?.type === "folder" ? "folder" : "tài liệu"}?
          </DialogTitle>
          <DialogDescription>
            {target?.type === "folder"
              ? `Folder “${target?.name}” chỉ được xóa khi đang trống.`
              : `Mọi version của “${target?.name}” sẽ bị xóa khỏi Discord và MongoDB.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onDelete}>
            <Trash2 data-icon="inline-start" /> Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
