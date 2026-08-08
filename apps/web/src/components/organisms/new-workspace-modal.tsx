"use client";

import { useState } from "react";
import { FormProvider } from "react-hook-form";
import { Boxes, LoaderCircle, Plus } from "lucide-react";
import { WorkspaceFormFields } from "@/components/molecules/workspace-form-fields";
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
import { useCreateWorkspaceForm } from "@/features/workspaces/hooks/use-create-workspace-form";

interface NewWorkspaceModalProps {
  trigger?: React.ReactNode;
}

export function NewWorkspaceModal({ trigger }: NewWorkspaceModalProps) {
  const [open, setOpen] = useState(false);
  const { form, submit, reset } = useCreateWorkspaceForm({
    switchAfterCreate: true,
    onCreated: () => window.location.assign("/"),
  });

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
          >
            <Plus className="size-4" />
            Tạo workspace mới
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
              <Boxes className="size-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Tạo workspace mới</DialogTitle>
              <DialogDescription className="mt-0.5">
                Bạn sẽ là Owner và hệ thống tự chuyển sang workspace mới sau khi
                tạo thành công.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <FormProvider {...form}>
          <form
            id="new-workspace-form"
            onSubmit={form.handleSubmit(submit)}
            noValidate
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4">
              <WorkspaceFormFields
                idPrefix="nw"
                slugDescription="Để trống để tự động tạo từ tên."
              />
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
                    <Plus />
                    Tạo và chuyển workspace
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
