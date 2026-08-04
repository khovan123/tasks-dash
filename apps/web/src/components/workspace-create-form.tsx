"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import {
  WorkspaceFormValues,
  workspaceFormSchema,
} from "@/features/workspaces/schemas/workspace-form.schema";
import { FormCard } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function WorkspaceCreateForm() {
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: { workspaceName: "", workspaceSlug: "" },
  });

  async function submit(values: WorkspaceFormValues): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest("/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          workspaceName: values.workspaceName,
          workspaceSlug: values.workspaceSlug || undefined,
        }),
      });
      window.location.assign("/");
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof Error ? cause.message : "Không thể tạo workspace.",
      });
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="Multi-workspace"
          title="Tạo workspace mới"
          description="Bạn sẽ trở thành Owner và hệ thống tự chuyển sang workspace mới sau khi tạo."
          footer={
            <Button disabled={form.formState.isSubmitting}>
              <Plus />
              {form.formState.isSubmitting ? "Đang tạo…" : "Tạo và chuyển workspace"}
            </Button>
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="workspace-name">Tên workspace</FieldLabel>
              <Input
                id="workspace-name"
                {...form.register("workspaceName")}
                placeholder="Product Delivery"
                aria-invalid={Boolean(form.formState.errors.workspaceName)}
              />
              {form.formState.errors.workspaceName?.message ? (
                <FieldError>{form.formState.errors.workspaceName.message}</FieldError>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="workspace-slug">Slug tùy chọn</FieldLabel>
              <Input
                id="workspace-slug"
                {...form.register("workspaceSlug")}
                placeholder="product-delivery"
                aria-invalid={Boolean(form.formState.errors.workspaceSlug)}
              />
              {form.formState.errors.workspaceSlug?.message ? (
                <FieldError>{form.formState.errors.workspaceSlug.message}</FieldError>
              ) : null}
            </Field>
          </FieldGroup>
          {form.formState.errors.root?.message ? (
            <FieldError>{form.formState.errors.root.message}</FieldError>
          ) : null}
        </FormCard>
      </form>
    </FormProvider>
  );
}
