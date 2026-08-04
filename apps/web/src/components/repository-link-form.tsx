"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import {
  RepositoryLinkFormValues,
  RepositoryLinkPayload,
  repositoryLinkSchema,
} from "@/features/integrations/schemas/repository-link.schema";
import { apiRequest } from "@/lib/api/api-request";

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
      <form
        className="form-card"
        onSubmit={form.handleSubmit(submit)}
        noValidate
      >
        <div className="section-heading">
          <div>
            <span>GITHUB REPOSITORY</span>
            <h2>Liên kết repository</h2>
          </div>
          {currentRepositoryFullName ? (
            <a
              href={`https://github.com/${currentRepositoryFullName}`}
              target="_blank"
              rel="noreferrer"
            >
              {currentRepositoryFullName}
            </a>
          ) : null}
        </div>

        {repositories.length === 0 ? (
          <p className="empty-inline">
            Chưa có repository khả dụng. Hãy cài GitHub App hoặc cấp quyền cho
            repository trong <Link href="/settings/integrations">Tích hợp</Link>.
          </p>
        ) : (
          <div className="form-grid">
            <label className="wide">
              Repository từ GitHub
              <select
                {...form.register("repositoryId")}
                aria-invalid={Boolean(form.formState.errors.repositoryId)}
              >
                <option value="">Chọn repository</option>
                {repositories.map((repository) => {
                  const linkedElsewhere =
                    repository.linkedProjectKey &&
                    repository.linkedProjectKey !== projectKey;
                  return (
                    <option
                      key={repository.id}
                      value={repository.id}
                      disabled={Boolean(linkedElsewhere)}
                    >
                      {repository.full_name} · {repository.private ? "Private" : "Public"}
                      {linkedElsewhere
                        ? ` · đã liên kết ${repository.linkedProjectKey}`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        )}

        <p className="form-message">
          Tên repository, URL, quyền riêng tư và default branch được lấy trực
          tiếp từ GitHub App. Không nhập thủ công owner/repository.
        </p>

        {form.formState.errors.repositoryId?.message ? (
          <p className="error">
            {form.formState.errors.repositoryId.message}
          </p>
        ) : null}
        {form.formState.errors.root?.message ? (
          <p className="error">{form.formState.errors.root.message}</p>
        ) : null}

        <div className="form-actions">
          <button
            className="primary"
            disabled={form.formState.isSubmitting || repositories.length === 0}
          >
            {form.formState.isSubmitting
              ? "Đang liên kết…"
              : currentRepositoryFullName
                ? "Đổi repository"
                : "Liên kết repository"}
          </button>
          {currentRepositoryFullName ? (
            <button
              className="secondary"
              type="button"
              disabled={form.formState.isSubmitting}
              onClick={() => void unlink()}
            >
              Ngắt liên kết
            </button>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}
