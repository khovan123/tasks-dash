"use client";

import { useState } from "react";
import type { WorkItemFormValues } from "@/features/work-items/schemas/work-item-form.schema";
import type { DetailWorkItem, WorkItemView } from "@/features/work-items/types";
import {
  normalizeDetailWorkItem,
  workItemCreatePayload,
} from "@/features/work-items/lib/work-item-values";
import { apiRequest } from "@/lib/api/api-request";
import {
  mutationErrorMessage,
  mutationFailure,
  mutationSuccess,
  type MutationResult,
} from "@/lib/api/mutation-result";

interface UseWorkItemMutationsOptions {
  projectKey: string;
  onUpdate?: (item: DetailWorkItem) => void;
}

export function useWorkItemMutations({
  projectKey,
  onUpdate,
}: UseWorkItemMutationsOptions) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError(): void {
    setError(null);
  }

  async function create(
    values: WorkItemFormValues,
    sprintId?: string | null,
  ): Promise<MutationResult<WorkItemView>> {
    setPending(true);
    setError(null);
    try {
      const item = await apiRequest<WorkItemView>(
        `/api/projects/${projectKey}/work-items`,
        {
          method: "POST",
          body: JSON.stringify(workItemCreatePayload(values, sprintId)),
        },
      );
      return mutationSuccess(item);
    } catch (cause) {
      const message = mutationErrorMessage(cause, "Không thể tạo work item.");
      setError(message);
      return mutationFailure(message);
    } finally {
      setPending(false);
    }
  }

  async function patch(
    item: DetailWorkItem,
    fields: Record<string, unknown>,
  ): Promise<MutationResult<DetailWorkItem>> {
    const previous = normalizeDetailWorkItem(item);
    const optimistic = normalizeDetailWorkItem({
      ...previous,
      ...fields,
    } as DetailWorkItem);
    onUpdate?.(optimistic);
    setPending(true);
    setError(null);
    try {
      const saved = await apiRequest<DetailWorkItem>(
        `/api/work-items/${previous.key}`,
        {
          method: "PATCH",
          body: JSON.stringify(fields),
        },
      );
      const normalized = normalizeDetailWorkItem(saved);
      onUpdate?.(normalized);
      return mutationSuccess(normalized);
    } catch (cause) {
      onUpdate?.(previous);
      const message = mutationErrorMessage(cause, "Không thể cập nhật work item.");
      setError(message);
      return mutationFailure(message);
    } finally {
      setPending(false);
    }
  }

  async function changeStatus(
    item: DetailWorkItem,
    statusId: string,
  ): Promise<MutationResult<DetailWorkItem>> {
    const previous = normalizeDetailWorkItem(item);
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/api/work-items/${previous.key}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statusId }),
      });
      const next = normalizeDetailWorkItem({ ...previous, statusId });
      onUpdate?.(next);
      return mutationSuccess(next);
    } catch (cause) {
      const message = mutationErrorMessage(cause, "Không thể đổi trạng thái.");
      setError(message);
      return mutationFailure(message);
    } finally {
      setPending(false);
    }
  }

  async function assign(
    item: DetailWorkItem,
    assigneeId: string | null,
  ): Promise<MutationResult<DetailWorkItem>> {
    const previous = normalizeDetailWorkItem(item);
    setPending(true);
    setError(null);
    try {
      await apiRequest(
        `/api/projects/${projectKey}/work-items/${previous.key}/assign`,
        {
          method: "PATCH",
          body: JSON.stringify({ assigneeId }),
        },
      );
      const next = normalizeDetailWorkItem({
        ...previous,
        assigneeId: assigneeId ?? undefined,
      });
      onUpdate?.(next);
      return mutationSuccess(next);
    } catch (cause) {
      const message = mutationErrorMessage(cause, "Không thể gán thành viên.");
      setError(message);
      return mutationFailure(message);
    } finally {
      setPending(false);
    }
  }

  return {
    assign,
    changeStatus,
    clearError,
    create,
    error,
    patch,
    pending,
  };
}
