"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { FolderPlus } from "lucide-react";
import { apiRequest } from "@/lib/api/api-request";
import {
  ProjectFormPayload,
  ProjectFormValues,
  projectFormSchema,
} from "@/features/projects/schemas/project-form.schema";
import { FormCard } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Spinner } from "@/components/ui/spinner";

const DEFAULT_VALUES: ProjectFormValues = { key: "", name: "", description: "" };

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
        body: JSON.stringify({ ...values, color: "#6256f5" }),
      });
      form.reset(DEFAULT_VALUES);
      router.refresh();
    } catch (error) {
      form.setError("root", { message: error instanceof Error ? error.message : "Không thể tạo dự án." });
    }
  }
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="Create project"
          title="Tạo dự án thật"
          description="Repository được chọn từ GitHub App. Nếu Discord Bot đã cấu hình, hệ thống tự tạo channel Updates và Docs cho project."
          footer={
            <Button disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Spinner className="mr-2" /> Đang tạo
                </>
              ) : (
                <>
                  <FolderPlus /> Tạo dự án
                </>
              )}
            </Button>
          }
        >
          <FieldGroup>
            <Field><FieldLabel htmlFor="project-key">Project key</FieldLabel><Input id="project-key" {...form.register("key")} placeholder="TD" />{form.formState.errors.key?.message ? <FieldError>{form.formState.errors.key.message}</FieldError> : null}</Field>
            <Field><FieldLabel htmlFor="project-name">Tên dự án</FieldLabel><Input id="project-name" {...form.register("name")} placeholder="Tasks Dash" />{form.formState.errors.name?.message ? <FieldError>{form.formState.errors.name.message}</FieldError> : null}</Field>
          </FieldGroup>
          <Field><FieldLabel htmlFor="project-description">Mô tả</FieldLabel><Textarea id="project-description" {...form.register("description")} placeholder="Mục tiêu và phạm vi dự án" /><FieldDescription>Mô tả này hiển thị trên dashboard workspace.</FieldDescription>{form.formState.errors.description?.message ? <FieldError>{form.formState.errors.description.message}</FieldError> : null}</Field>
          {form.formState.errors.root?.message ? <FieldError>{form.formState.errors.root.message}</FieldError> : null}
        </FormCard>
      </form>
    </FormProvider>
  );
}
