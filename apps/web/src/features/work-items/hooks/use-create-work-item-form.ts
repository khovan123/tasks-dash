"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useCurrentUserId } from "@/features/auth/hooks/use-current-user-id";
import {
  type WorkItemFormInput,
  type WorkItemFormValues,
  workItemFormSchema,
} from "@/features/work-items/schemas/work-item-form.schema";
import type {
  WorkflowStatusView,
  WorkItemMember,
} from "@/features/work-items/types";
import { WORK_ITEM_FORM_DEFAULT_VALUES } from "@/features/work-items/lib/work-item-values";
import { useWorkItemMutations } from "@/features/work-items/hooks/use-work-item-mutations";

interface UseCreateWorkItemFormOptions {
  projectKey: string;
  statuses: WorkflowStatusView[];
  members: WorkItemMember[];
  sprintId?: string | null;
  onSuccess?: () => void;
}

export function useCreateWorkItemForm({
  projectKey,
  statuses,
  members,
  sprintId,
  onSuccess,
}: UseCreateWorkItemFormOptions) {
  const myUserId = useCurrentUserId();
  const mutations = useWorkItemMutations({ projectKey });
  const form = useForm<WorkItemFormInput, unknown, WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      ...WORK_ITEM_FORM_DEFAULT_VALUES,
      statusId: statuses[0]?.id ?? "",
    },
  });
  const figmaLinks = useFieldArray({ control: form.control, name: "figmaLinks" });
  const documentLinks = useFieldArray({
    control: form.control,
    name: "documentLinks",
  });

  const canAssignToMe = Boolean(
    myUserId && members.some((member) => member.id === myUserId),
  );

  async function submit(values: WorkItemFormValues): Promise<void> {
    form.clearErrors("root");
    const result = await mutations.create(values, sprintId);
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    form.reset({
      ...WORK_ITEM_FORM_DEFAULT_VALUES,
      statusId: statuses[0]?.id ?? "",
    });
    onSuccess?.();
  }

  function assignToMe(): void {
    if (myUserId && canAssignToMe) {
      form.setValue("assigneeId", myUserId, { shouldValidate: true });
    }
  }

  return {
    assignToMe,
    canAssignToMe,
    documentLinks,
    figmaLinks,
    form,
    myUserId,
    submit,
  };
}
