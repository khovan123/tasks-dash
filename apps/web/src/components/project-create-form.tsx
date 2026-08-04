"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { apiRequest } from "@/lib/api/api-request";
import {
  ProjectFormPayload,
  ProjectFormValues,
  projectFormSchema,
} from "@/features/projects/schemas/project-form.schema";

const DEFAULT_VALUES: ProjectFormValues = {
  key: "",
  name: "",
  description: "",
  repositoryFullName: "",
  driveRootFolderId: "",
};

export function ProjectCreateForm() {
  const router = useRouter();
  const form = useForm<ProjectFormValues, unknown, ProjectFormPayload>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function submit(values: ProjectFormPayload): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          ...values,
          color: "#6256f5",
          repositoryFullName: values.repositoryFullName || undefined,
          driveRootFolderId: values.driveRootFolderId || undefined,
        }),
      });
      form.reset(DEFAULT_VALUES);
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Không thể tạo dự án.",
      });
    }
  }

  return (
    <FormProvider {...form}>
      <form className="form-card" onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="section-heading">
          <div><span>CREATE PROJECT</span><h2>Tạo dự án thật</h2></div>
        </div>
        <div className="form-grid">
          <label>Project key<input {...form.register("key")} placeholder="TD" aria-invalid={Boolean(form.formState.errors.key)} /></label>
          <label>Tên dự án<input {...form.register("name")} placeholder="Tasks Dash" aria-invalid={Boolean(form.formState.errors.name)} /></label>
          <label className="wide">Mô tả<textarea {...form.register("description")} placeholder="Mục tiêu và phạm vi dự án" aria-invalid={Boolean(form.formState.errors.description)} /></label>
          <label>GitHub repository<input {...form.register("repositoryFullName")} placeholder="owner/repository" aria-invalid={Boolean(form.formState.errors.repositoryFullName)} /></label>
          <label>Google Drive folder ID<input {...form.register("driveRootFolderId")} placeholder="1AbCd..." aria-invalid={Boolean(form.formState.errors.driveRootFolderId)} /></label>
        </div>
        {Object.values(form.formState.errors)[0]?.message ? <p className="error">{String(Object.values(form.formState.errors)[0]?.message)}</p> : null}
        <button className="primary" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Đang tạo…" : "Tạo dự án"}</button>
      </form>
    </FormProvider>
  );
}
