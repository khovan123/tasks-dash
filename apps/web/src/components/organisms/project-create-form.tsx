"use client";

import { FormProvider } from "react-hook-form";
import { FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProjectFormFields } from "@/components/molecules/project-form-fields";
import { FormCard } from "@/components/organisms/form-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCreateProjectForm } from "@/features/projects/hooks/use-create-project-form";

export function ProjectCreateForm() {
  const router = useRouter();
  const { form, submit } = useCreateProjectForm({
    onCreated: () => router.refresh(),
  });

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
          <ProjectFormFields
            idPrefix="project"
            descriptionHelp="Mô tả này hiển thị trên dashboard workspace."
          />
        </FormCard>
      </form>
    </FormProvider>
  );
}
