"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  type ProjectFormPayload,
  type ProjectFormValues,
  projectFormSchema,
} from "@/features/projects/schemas/project-form.schema";
import { apiRequest } from "@/lib/api/api-request";

export interface CreatedProject {
  key: string;
}

export const PROJECT_FORM_DEFAULT_VALUES: ProjectFormValues = {
  key: "",
  name: "",
  description: "",
};

interface UseCreateProjectFormOptions {
  onCreated?: (project: CreatedProject) => void | Promise<void>;
}

export function useCreateProjectForm({
  onCreated,
}: UseCreateProjectFormOptions = {}) {
  const form = useForm<ProjectFormValues, unknown, ProjectFormPayload>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: PROJECT_FORM_DEFAULT_VALUES,
  });

  async function submit(values: ProjectFormPayload): Promise<CreatedProject | null> {
    form.clearErrors("root");
    try {
      const project = await apiRequest<CreatedProject>("/api/projects", {
        method: "POST",
        body: JSON.stringify(values),
      });
      form.reset(PROJECT_FORM_DEFAULT_VALUES);
      await onCreated?.(project);
      return project;
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Không thể tạo dự án.",
      });
      return null;
    }
  }

  function reset(): void {
    form.reset(PROJECT_FORM_DEFAULT_VALUES);
  }

  return { form, submit, reset };
}
