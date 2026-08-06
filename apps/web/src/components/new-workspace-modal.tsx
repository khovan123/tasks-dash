"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { Boxes, LoaderCircle, Plus } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import {
  WorkspaceFormValues,
  workspaceFormSchema,
} from "@/features/workspaces/schemas/workspace-form.schema";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface NewWorkspaceResponse {
  workspaceId: string;
  name: string;
}

interface NewWorkspaceModalProps {
  /** Custom trigger element — defaults to a "+ Workspace" button */
  trigger?: React.ReactNode;
}

export function NewWorkspaceModal({ trigger }: NewWorkspaceModalProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: { workspaceName: "", workspaceSlug: "" },
  });

  async function submit(values: WorkspaceFormValues): Promise<void> {
    form.clearErrors("root");
    try {
      // 1. Create the workspace
      const res = await apiRequest<NewWorkspaceResponse>("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          workspaceName: values.workspaceName,
          workspaceSlug: values.workspaceSlug || undefined,
        }),
      });

      // 2. Auto-switch to the new workspace
      if (res?.workspaceId) {
        await apiRequest(`/api/workspaces/${res.workspaceId}/switch`, {
          method: "POST",
        });
      }

      // 3. Full reload to pick up new session
      window.location.assign("/");
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof Error ? cause.message : "Không thể tạo workspace.",
      });
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
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
              <Field>
                <FieldLabel htmlFor="nw-name">Tên workspace *</FieldLabel>
                <Input
                  id="nw-name"
                  {...form.register("workspaceName")}
                  placeholder="Product Delivery"
                  autoFocus
                  aria-invalid={Boolean(form.formState.errors.workspaceName)}
                />
                {form.formState.errors.workspaceName?.message ? (
                  <FieldError>
                    {form.formState.errors.workspaceName.message}
                  </FieldError>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="nw-slug">Slug tùy chọn</FieldLabel>
                <Input
                  id="nw-slug"
                  {...form.register("workspaceSlug")}
                  placeholder="product-delivery"
                  aria-invalid={Boolean(form.formState.errors.workspaceSlug)}
                />
                <FieldDescription>
                  Để trống để tự động tạo từ tên.
                </FieldDescription>
                {form.formState.errors.workspaceSlug?.message ? (
                  <FieldError>
                    {form.formState.errors.workspaceSlug.message}
                  </FieldError>
                ) : null}
              </Field>

              {form.formState.errors.root?.message ? (
                <FieldError>{form.formState.errors.root.message}</FieldError>
              ) : null}
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
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
              >
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
