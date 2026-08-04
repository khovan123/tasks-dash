"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { apiRequest } from "@/lib/api/api-request";
import {
  WorkspaceFormValues,
  workspaceFormSchema,
} from "@/features/workspaces/schemas/workspace-form.schema";

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
      <form className="form-card" onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="section-heading">
          <div>
            <span>MULTI-WORKSPACE</span>
            <h2>Tạo workspace mới</h2>
          </div>
        </div>
        <p className="form-message">
          Bạn sẽ trở thành Owner và hệ thống tự chuyển sang workspace mới sau khi tạo.
        </p>
        <div className="form-grid">
          <label>
            Tên workspace
            <input
              {...form.register("workspaceName")}
              placeholder="Product Delivery"
              aria-invalid={Boolean(form.formState.errors.workspaceName)}
            />
          </label>
          <label>
            Slug tùy chọn
            <input
              {...form.register("workspaceSlug")}
              placeholder="product-delivery"
              aria-invalid={Boolean(form.formState.errors.workspaceSlug)}
            />
          </label>
        </div>
        {form.formState.errors.root?.message ? (
          <p className="error">{form.formState.errors.root.message}</p>
        ) : null}
        <button className="primary" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Đang tạo…" : "Tạo và chuyển workspace"}
        </button>
      </form>
    </FormProvider>
  );
}
