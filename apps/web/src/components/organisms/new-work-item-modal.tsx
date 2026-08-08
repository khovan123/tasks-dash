"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { WorkItemCreateForm } from "@/components/organisms/work-item-create-form";
import type {
  WorkflowStatusView,
  WorkItemMember,
} from "@/features/work-items/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NewWorkItemModalProps {
  projectKey: string;
  statuses: WorkflowStatusView[];
  members: WorkItemMember[];
  sprintId?: string | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function NewWorkItemModal({
  projectKey,
  statuses,
  members,
  sprintId,
  trigger,
  onSuccess,
}: NewWorkItemModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Plus className="size-4" />
            Tạo công việc
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 pb-4 pt-6">
          <DialogTitle>Tạo công việc mới</DialogTitle>
          <DialogDescription>
            Tạo Task, Module hoặc Bug mới cho dự án {projectKey}.
          </DialogDescription>
        </DialogHeader>
        <WorkItemCreateForm
          projectKey={projectKey}
          statuses={statuses}
          members={members}
          sprintId={sprintId}
          inlineMode
          onSuccess={() => {
            setOpen(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
