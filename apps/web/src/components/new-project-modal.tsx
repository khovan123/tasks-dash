"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { FolderPlus, LoaderCircle, Plus } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import {
  ProjectFormPayload,
  ProjectFormValues,
  projectFormSchema,
} from "@/features/projects/schemas/project-form.schema";
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ProjectResponse {
  key: string;
}

interface NewProjectModalProps {
  trigger?: React.ReactNode;
}

const DEFAULT_VALUES: ProjectFormValues = {
  key: "",
  name: "",
  description: "",
};

export function NewProjectModal({ trigger }: NewProjectModalProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const form = useForm<ProjectFormValues, unknown, ProjectFormPayload>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function submit(values: ProjectFormPayload): Promise<void> {
    form.clearErrors("root");
    try {
      const res = await apiRequest<ProjectResponse>("/api/projects", {
        method: "POST",
        body: JSON.stringify(values),
      });

      setOpen(false);
      form.reset(DEFAULT_VALUES);

      if (res?.key) {
        window.location.assign(`/projects/${res.key.toUpperCase()}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Không thể tạo dự án.",
      });
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) form.reset(DEFAULT_VALUES);
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
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="np-key">Project key *</FieldLabel>
                  <Input
                    id="np-key"
                    {...form.register("key")}
                    placeholder="TD"
                    autoFocus
                    aria-invalid={Boolean(form.formState.errors.key)}
                  />
                  {form.formState.errors.key?.message ? (
                    <FieldError>{form.formState.errors.key.message}</FieldError>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel htmlFor="np-name">Tên dự án *</FieldLabel>
                  <Input
                    id="np-name"
                    {...form.register("name")}
                    placeholder="Tasks Dash"
                    aria-invalid={Boolean(form.formState.errors.name)}
                  />
                  {form.formState.errors.name?.message ? (
                    <FieldError>
                      {form.formState.errors.name.message}
                    </FieldError>
                  ) : null}
                </Field>
              </FieldGroup>

              <Field>
                <FieldLabel htmlFor="np-desc">Mô tả *</FieldLabel>
                <Textarea
                  id="np-desc"
                  {...form.register("description")}
                  placeholder="Mục tiêu và phạm vi dự án…"
                  aria-invalid={Boolean(form.formState.errors.description)}
                />
                {form.formState.errors.description?.message ? (
                  <FieldError>
                    {form.formState.errors.description.message}
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
