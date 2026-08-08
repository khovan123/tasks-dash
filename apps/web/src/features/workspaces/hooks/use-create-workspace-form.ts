"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  type WorkspaceFormValues,
  workspaceFormSchema,
} from "@/features/workspaces/schemas/workspace-form.schema";
import { apiRequest } from "@/lib/api/api-request";

export interface CreatedWorkspace {
  workspaceId?: string;
  name?: string;
}

export const WORKSPACE_FORM_DEFAULT_VALUES: WorkspaceFormValues = {
  workspaceName: "",
  workspaceSlug: "",
};

interface UseCreateWorkspaceFormOptions {
  setupToken?: string;
  switchAfterCreate?: boolean;
  onCreated?: (workspace: CreatedWorkspace) => void | Promise<void>;
}

export function useCreateWorkspaceForm({
  setupToken,
  switchAfterCreate = false,
  onCreated,
}: UseCreateWorkspaceFormOptions = {}) {
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: WORKSPACE_FORM_DEFAULT_VALUES,
  });

  async function submit(values: WorkspaceFormValues): Promise<CreatedWorkspace | null> {
    form.clearErrors("root");
    try {
      const workspace = await apiRequest<CreatedWorkspace>(
        setupToken ? "/api/workspaces/setup" : "/api/workspaces",
        {
          method: "POST",
          body: JSON.stringify({
            workspaceName: values.workspaceName,
            workspaceSlug: values.workspaceSlug || undefined,
            ...(setupToken ? { setupToken } : {}),
          }),
        },
      );

      if (switchAfterCreate && workspace.workspaceId) {
        await apiRequest(`/api/workspaces/${workspace.workspaceId}/switch`, {
          method: "POST",
        });
      }

      form.reset(WORKSPACE_FORM_DEFAULT_VALUES);
      await onCreated?.(workspace);
      return workspace;
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof Error ? cause.message : "Không thể tạo workspace.",
      });
      return null;
    }
  }

  function reset(): void {
    form.reset(WORKSPACE_FORM_DEFAULT_VALUES);
  }

  return { form, submit, reset };
}
