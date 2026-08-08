"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Github, Link2Off, Save } from "lucide-react";
import { SearchableSelect } from "@/components/molecules/searchable-select";
import type { GithubRepositoryOption } from "@/features/integrations/types";
import {
  type RepositoryLinkFormValues,
  type RepositoryLinkPayload,
  repositoryLinkSchema,
} from "@/features/integrations/schemas/repository-link.schema";
import { apiRequest } from "@/lib/api/api-request";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  selectProject,
  upsertProjectDetail,
} from "@/lib/store/realtime-slice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

export interface RepositoryLinkFormProps {
  projectKey: string;
  currentRepositoryFullName?: string;
  repositories: GithubRepositoryOption[];
  canManage?: boolean;
}

interface RepositoryMutationResult {
  projectKey: string;
  repository: null | { fullName: string };
}

export function RepositoryLinkForm({
  projectKey,
  currentRepositoryFullName,
  repositories,
  canManage = false,
}: RepositoryLinkFormProps) {
  const dispatch = useAppDispatch();
  const currentProject = useAppSelector(selectProject(projectKey));
  const [isEditing, setIsEditing] = useState(false);
  const currentRepository = repositories.find(
    (repository) => repository.full_name === currentRepositoryFullName,
  );
  const repositoryOptions = useMemo(
    () =>
      repositories.map((repository) => ({
        value: String(repository.id),
        label: repository.full_name,
      })),
    [repositories],
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

  function updateRepository(repositoryFullName?: string) {
    dispatch(
      upsertProjectDetail({
        ...(currentProject ?? { key: projectKey, name: projectKey }),
        key: projectKey,
        repositoryFullName,
      }),
    );
  }

  async function submit(values: RepositoryLinkPayload): Promise<void> {
    form.clearErrors("root");
    try {
      const result = await apiRequest<RepositoryMutationResult>(
        `/api/integrations/github/projects/${projectKey}/repository`,
        {
          method: "PATCH",
          body: JSON.stringify({ repositoryId: values.repositoryId }),
        },
      );
      updateRepository(result.repository?.fullName);
      setIsEditing(false);
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Không thể liên kết repository.",
      });
    }
  }

  async function unlink(): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest<RepositoryMutationResult>(
        `/api/integrations/github/projects/${projectKey}/repository`,
        { method: "DELETE" },
      );
      updateRepository(undefined);
      form.reset({ repositoryId: "" });
      setIsEditing(false);
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Không thể ngắt liên kết repository.",
      });
    }
  }

  const showSelector = (!currentRepositoryFullName || isEditing) && canManage;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate className="w-full">
        <div className="w-full rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-2xl">
          <div className="mb-3 flex flex-col gap-1.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Github className="size-4 text-primary" /> Liên kết GitHub Repository
            </h3>
          </div>

          <div className="flex w-full flex-col items-end gap-3 sm:flex-row">
            <div className="w-full flex-1">
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
              ) : showSelector ? (
                <Field className="w-full">
                  <FieldLabel htmlFor="github-repository" className="text-xs">
                    Repository từ GitHub
                  </FieldLabel>
                  <Controller
                    control={form.control}
                    name="repositoryId"
                    render={({ field }) => (
                      <SearchableSelect
                        triggerId="github-repository"
                        value={field.value}
                        options={repositoryOptions}
                        onValueChange={field.onChange}
                        placeholder="Chọn repository..."
                        searchPlaceholder="Tìm kiếm repository..."
                        emptyText="Không tìm thấy repository."
                      />
                    )}
                  />
                  {form.formState.errors.repositoryId?.message ? (
                    <FieldError className="mt-1 text-[11px]">
                      {form.formState.errors.repositoryId.message}
                    </FieldError>
                  ) : null}
                </Field>
              ) : currentRepositoryFullName ? (
                <div className="flex flex-col gap-1 py-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Repository đang liên kết
                  </span>
                  <a
                    className="w-fit text-sm font-bold text-primary hover:underline"
                    href={`https://github.com/${currentRepositoryFullName}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {currentRepositoryFullName}
                  </a>
                </div>
              ) : (
                <div className="flex flex-col gap-1 py-1">
                  <span className="text-xs font-medium text-muted-foreground">GitHub Repository</span>
                  <span className="text-sm text-muted-foreground">Chưa liên kết repository.</span>
                </div>
              )}
            </div>

            {canManage ? (
              <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                {showSelector ? (
                  <>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={
                        form.formState.isSubmitting ||
                        repositories.length === 0 ||
                        !form.watch("repositoryId")
                      }
                    >
                      <Save />
                      {form.formState.isSubmitting ? "Đang lưu…" : "Lưu thay đổi"}
                    </Button>
                    {currentRepositoryFullName ? (
                      <Button
                        variant="ghost"
                        type="button"
                        className="w-full sm:w-auto"
                        onClick={() => setIsEditing(false)}
                        disabled={form.formState.isSubmitting}
                      >
                        Hủy
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={() => setIsEditing(true)}
                      disabled={form.formState.isSubmitting}
                    >
                      <Github /> Đổi repository
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full sm:w-auto"
                      disabled={form.formState.isSubmitting}
                      onClick={() => void unlink()}
                    >
                      <Link2Off /> Ngắt liên kết
                    </Button>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {form.formState.errors.root?.message ? (
            <FieldError className="mt-2 text-xs">{form.formState.errors.root.message}</FieldError>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}
