"use client";

import { useState } from "react";
import { FormProvider } from "react-hook-form";
import { FolderPlus, LoaderCircle, Plus } from "lucide-react";
import { ProjectFormFields } from "@/components/molecules/project-form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateProjectForm } from "@/features/projects/hooks/use-create-project-form";

interface NewProjectModalProps {
  trigger?: React.ReactNode;
}

export function NewProjectModal({ trigger }: NewProjectModalProps) {
  const [open, setOpen] = useState(false);
  const { form, submit, reset } = useCreateProjectForm({
    onCreated: (project) => {
      setOpen(false);
      window.location.assign(`/projects/${project.key.toUpperCase()}`);
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <Plus className="size-4" />
            Tạo dự án
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
              <FolderPlus className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Tạo dự án mới</DialogTitle>
              <DialogDescription className="mt-0.5">
                Tạo dự án mới để quản lý backlog, tài liệu Discord và workflow.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <FormProvider {...form}>
          <form
            id="new-project-form"
            onSubmit={form.handleSubmit(submit)}
            noValidate
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4">
              <ProjectFormFields idPrefix="np" />
            </div>

            <DialogFooter className="shrink-0 border-t px-6 py-4 bg-muted/20">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <LoaderCircle className="animate-spin" />
                    Đang tạo…
                  </>
                ) : (
                  <>
                    <FolderPlus />
                    Tạo dự án
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
