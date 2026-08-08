"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { Check, ChevronsUpDown, Github, Link2Off, Save } from "lucide-react";
import {
  RepositoryLinkFormValues,
  RepositoryLinkPayload,
  repositoryLinkSchema,
} from "@/features/integrations/schemas/repository-link.schema";
import { apiRequest } from "@/lib/api/api-request";
import { useAppDispatch } from "@/lib/store/hooks";
import { upsertProjectDetail } from "@/lib/store/realtime-slice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface GithubRepositoryOption {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  linkedProjectKey?: string;
}

export interface RepositoryLinkFormProps {
  projectKey: string;
  currentRepositoryFullName?: string;
  repositories: GithubRepositoryOption[];
  canManage?: boolean;
}

interface RepositoryMutationResult {
  projectKey: string;
  repository: null | {
    fullName: string;
  };
}

export function RepositoryLinkForm({
  projectKey,
  currentRepositoryFullName,
  repositories,
  canManage = false,
}: RepositoryLinkFormProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      const result = await apiRequest<RepositoryMutationResult>(
        `/api/integrations/github/projects/${projectKey}/repository`,
        {
          method: "PATCH",
          body: JSON.stringify({ repositoryId: values.repositoryId }),
        },
      );
      dispatch(
        upsertProjectDetail({
          key: result.projectKey,
          name: result.projectKey,
          repositoryFullName: result.repository?.fullName,
        }),
      );
      setIsEditing(false);
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
      const result = await apiRequest<RepositoryMutationResult>(
        `/api/integrations/github/projects/${projectKey}/repository`,
        { method: "DELETE" },
      );
      dispatch(
        upsertProjectDetail({
          key: result.projectKey,
          name: result.projectKey,
          repositoryFullName: undefined,
        }),
      );
      form.reset({ repositoryId: "" });
      setIsEditing(false);
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Không thể ngắt liên kết repository.",
      });
    }
  }

  const showSelector = (!currentRepositoryFullName || isEditing) && canManage;

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate className="w-full">
        <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-2xl w-full">
          <div className="flex flex-col gap-1.5 mb-3">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Github className="size-4 text-primary" />
              Liên kết GitHub Repository
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-end gap-3 w-full">
            <div className="flex-1 w-full">
              {repositories.length === 0 ? (
                <Alert>
                  <AlertTitle>Chưa có repository khả dụng</AlertTitle>
                  <AlertDescription>
                    Cài GitHub App hoặc cấp quyền repository trong{" "}
                    <Link
                      className="font-medium text-primary hover:underline"
                      href="/settings/integrations"
                    >
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
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="github-repository"
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between font-normal"
                          >
                            {field.value
                              ? repositories.find(
                                  (r) => String(r.id) === field.value,
                                )?.full_name
                              : "Chọn repository..."}
                            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                          <Command>
                            <CommandInput placeholder="Tìm kiếm repository..." />
                            <CommandList>
                              <CommandEmpty>Không tìm thấy repository.</CommandEmpty>
                              <CommandGroup>
                                {repositories.map((repository) => (
                                  <CommandItem
                                    key={repository.id}
                                    value={repository.full_name}
                                    onSelect={() => {
                                      form.setValue(
                                        "repositoryId",
                                        String(repository.id),
                                      );
                                      setOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 size-4",
                                        field.value === String(repository.id)
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    {repository.full_name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {form.formState.errors.repositoryId?.message ? (
                    <FieldError className="text-[11px] mt-1">
                      {form.formState.errors.repositoryId.message}
                    </FieldError>
                  ) : null}
                </Field>
              ) : currentRepositoryFullName ? (
                <div className="flex flex-col gap-1 py-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    Repository đang liên kết
                  </span>
                  <a
                    className="font-bold text-primary hover:underline text-sm w-fit"
                    href={`https://github.com/${currentRepositoryFullName}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {currentRepositoryFullName}
                  </a>
                </div>
              ) : (
                <div className="flex flex-col gap-1 py-1">
                  <span className="text-xs text-muted-foreground font-medium">
                    GitHub Repository
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Chưa liên kết repository.
                  </span>
                </div>
              )}
            </div>

            {canManage && (
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
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
                    {currentRepositoryFullName && (
                      <Button
                        variant="ghost"
                        type="button"
                        className="w-full sm:w-auto"
                        onClick={() => setIsEditing(false)}
                        disabled={form.formState.isSubmitting}
                      >
                        Hủy
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={(event) => {
                        event.preventDefault();
                        setIsEditing(true);
                      }}
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
            )}
          </div>

          {form.formState.errors.root?.message ? (
            <FieldError className="mt-2 text-xs">
              {form.formState.errors.root.message}
            </FieldError>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}
