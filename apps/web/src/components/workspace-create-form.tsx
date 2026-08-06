"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import { Spinner } from "@/components/ui/spinner";
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

export function WorkspaceCreateForm({
  setupToken,
  firstWorkspace = false,
}: {
  setupToken?: string;
  firstWorkspace?: boolean;
}) {
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: { workspaceName: "", workspaceSlug: "" },
  });

  async function submit(values: WorkspaceFormValues): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest(setupToken ? "/api/workspaces/setup" : "/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          workspaceName: values.workspaceName,
          workspaceSlug: values.workspaceSlug || undefined,
          ...(setupToken ? { setupToken } : {}),
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
          eyebrow={firstWorkspace ? "Bắt đầu sử dụng" : "Multi-workspace"}
          title={firstWorkspace ? "Đặt tên workspace đầu tiên" : "Tạo workspace mới"}
          description={
            firstWorkspace
              ? "Tên workspace là bắt buộc. Project, thành viên, GitHub App và Discord của bạn sẽ được quản lý riêng trong workspace này."
              : "Bạn sẽ trở thành Owner và hệ thống tự chuyển sang workspace mới sau khi tạo."
          }
          footer={
            <div className="flex flex-wrap items-center gap-2">
              {!firstWorkspace ? (
                <Button asChild type="button" variant="ghost">
                  <Link href="/workspaces">Hủy</Link>
                </Button>
              ) : null}
              <Button disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Spinner className="mr-2" /> Đang tạo
                  </>
                ) : (
                  <>
                    <Plus />
                    {firstWorkspace
                      ? "Tạo workspace và tiếp tục"
                      : "Tạo và chuyển workspace"}
                  </>
                )}
              </Button>
            </div>
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="workspace-name">Tên workspace *</FieldLabel>
              <Input
                id="workspace-name"
                {...form.register("workspaceName")}
                placeholder="Product Delivery"
                autoFocus
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
