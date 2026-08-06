"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WorkItemCreateForm } from "@/components/work-item-create-form";

interface NewWorkItemModalProps {
  projectKey: string;
  statuses: any[];
  members: any[];
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

      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
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
          inlineMode={true}
          onSuccess={() => {
            setOpen(false);
            if (onSuccess) onSuccess();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
