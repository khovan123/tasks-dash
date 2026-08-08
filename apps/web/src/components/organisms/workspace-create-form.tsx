"use client";

import Link from "next/link";
import { FormProvider } from "react-hook-form";
import { Plus } from "lucide-react";
import { WorkspaceFormFields } from "@/components/molecules/workspace-form-fields";
import { FormCard } from "@/components/organisms/form-card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCreateWorkspaceForm } from "@/features/workspaces/hooks/use-create-workspace-form";

export function WorkspaceCreateForm({
  setupToken,
  firstWorkspace = false,
}: {
  setupToken?: string;
  firstWorkspace?: boolean;
}) {
  const { form, submit } = useCreateWorkspaceForm({
    setupToken,
    switchAfterCreate: !setupToken,
    onCreated: () => window.location.assign("/"),
  });

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
          <WorkspaceFormFields idPrefix="workspace" />
        </FormCard>
      </form>
    </FormProvider>
  );
}
