"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { Github, Link2Off } from "lucide-react";
import {
  RepositoryLinkFormValues,
  RepositoryLinkPayload,
  repositoryLinkSchema,
} from "@/features/integrations/schemas/repository-link.schema";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

export interface GithubRepositoryOption {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  linkedProjectKey?: string;
}

interface RepositoryLinkFormProps {
  projectKey: string;
  currentRepositoryFullName?: string;
  repositories: GithubRepositoryOption[];
}

export function RepositoryLinkForm({
  projectKey,
  currentRepositoryFullName,
  repositories,
}: RepositoryLinkFormProps) {
  const router = useRouter();
  const currentRepository = repositories.find(
    (repository) => repository.full_name === currentRepositoryFullName,
  );
  const form = useForm<
    RepositoryLinkFormValues,
    unknown,
    RepositoryLinkPayload
  >({
    resolver: zodResolver(repositoryLinkSchema),
    defaultValues: {
      repositoryId: currentRepository ? String(currentRepository.id) : "",
    },
  });

  async function submit(values: RepositoryLinkPayload): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest(
        `/api/integrations/github/projects/${projectKey}/repository`,
        {
          method: "PATCH",
          body: JSON.stringify({ repositoryId: values.repositoryId }),
        },
      );
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Không thể liên kết repository.",
      });
    }
  }

  async function unlink(): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest(
        `/api/integrations/github/projects/${projectKey}/repository`,
        { method: "DELETE" },
      );
      form.reset({ repositoryId: "" });
      router.refresh();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Không thể ngắt liên kết repository.",
      });
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="GitHub repository"
          title="Liên kết repository"
          description={
            currentRepositoryFullName ? (
              <a
                className="font-medium text-primary hover:underline"
                href={`https://github.com/${currentRepositoryFullName}`}
                target="_blank"
                rel="noreferrer"
              >
                {currentRepositoryFullName}
              </a>
            ) : (
              "Chọn repository trực tiếp từ GitHub App installation của workspace."
            )
          }
          footer={
            <>
              <Button
                disabled={form.formState.isSubmitting || repositories.length === 0}
              >
                <Github />
                {form.formState.isSubmitting
                  ? "Đang liên kết…"
                  : currentRepositoryFullName
                    ? "Đổi repository"
                    : "Liên kết repository"}
              </Button>
              {currentRepositoryFullName ? (
                <Button
                  variant="outline"
                  type="button"
                  disabled={form.formState.isSubmitting}
                  onClick={() => void unlink()}
                >
                  <Link2Off /> Ngắt liên kết
                </Button>
              ) : null}
            </>
          }
        >
          {repositories.length === 0 ? (
            <Alert>
              <AlertTitle>Chưa có repository khả dụng</AlertTitle>
              <AlertDescription>
                Cài GitHub App hoặc cấp quyền repository trong{" "}
                <Link className="font-medium text-primary hover:underline" href="/settings/integrations">
                  Tích hợp
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : (
            <Field>
              <FieldLabel htmlFor="github-repository">Repository từ GitHub</FieldLabel>
              <NativeSelect
                id="github-repository"
                {...form.register("repositoryId")}
                aria-invalid={Boolean(form.formState.errors.repositoryId)}
              >
                <NativeSelectOption value="">Chọn repository</NativeSelectOption>
                {repositories.map((repository) => {
                  const linkedElsewhere =
                    repository.linkedProjectKey &&
                    repository.linkedProjectKey !== projectKey;
                  return (
                    <NativeSelectOption
                      key={repository.id}
                      value={repository.id}
                      disabled={Boolean(linkedElsewhere)}
                    >
                      {repository.full_name} · {repository.private ? "Private" : "Public"}
                      {linkedElsewhere
                        ? ` · đã liên kết ${repository.linkedProjectKey}`
                        : ""}
                    </NativeSelectOption>
                  );
                })}
              </NativeSelect>
              <FieldDescription>
                Tên, URL, quyền riêng tư và default branch được lấy trực tiếp từ
                GitHub. Client chỉ gửi repository ID.
              </FieldDescription>
              {form.formState.errors.repositoryId?.message ? (
                <FieldError>{form.formState.errors.repositoryId.message}</FieldError>
              ) : null}
            </Field>
          )}
          {form.formState.errors.root?.message ? (
            <FieldError>{form.formState.errors.root.message}</FieldError>
          ) : null}
        </FormCard>
      </form>
    </FormProvider>
  );
}
