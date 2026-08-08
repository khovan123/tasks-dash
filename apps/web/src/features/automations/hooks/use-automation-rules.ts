"use client";

import { useEffect, useState } from "react";
import type { AutomationRule } from "@/features/automations/types";
import { apiRequest } from "@/lib/api/api-request";
import { mutationErrorMessage } from "@/lib/api/mutation-result";

export function useAutomationRules(
  projectKey: string,
  initialRules: AutomationRule[],
) {
  const [rules, setRules] = useState<AutomationRule[]>(initialRules);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  function clearError(): void {
    setError(null);
  }

  async function toggle(rule: AutomationRule): Promise<void> {
    const nextEnabled = !rule.enabled;
    setTogglingId(rule._id);
    setError(null);
    try {
      await apiRequest(`/api/projects/${projectKey}/automations/${rule._id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      setRules((current) =>
        current.map((item) =>
          item._id === rule._id ? { ...item, enabled: nextEnabled } : item,
        ),
      );
    } catch (cause) {
      setError(mutationErrorMessage(cause, "Không thể bật/tắt automation rule."));
    } finally {
      setTogglingId(null);
    }
  }

  async function run(rule: AutomationRule): Promise<void> {
    setRunningId(rule._id);
    setError(null);
    try {
      const updated = await apiRequest<AutomationRule>(
        `/api/projects/${projectKey}/automations/${rule._id}/run`,
        { method: "POST" },
      );
      setRules((current) =>
        current.map((item) => (item._id === rule._id ? updated : item)),
      );
    } catch (cause) {
      const message = mutationErrorMessage(cause, "Không thể chạy automation rule.");
      setError(message);
      setRules((current) =>
        current.map((item) =>
          item._id === rule._id
            ? { ...item, lastResult: "FAILED", lastError: message }
            : item,
        ),
      );
    } finally {
      setRunningId(null);
    }
  }

  async function remove(ruleId: string): Promise<void> {
    setDeletingId(ruleId);
    setError(null);
    try {
      await apiRequest(`/api/projects/${projectKey}/automations/${ruleId}`, {
        method: "DELETE",
      });
      setRules((current) => current.filter((item) => item._id !== ruleId));
    } catch (cause) {
      setError(mutationErrorMessage(cause, "Không thể xóa automation rule."));
    } finally {
      setDeletingId(null);
    }
  }

  return {
    clearError,
    deletingId,
    error,
    remove,
    rules,
    run,
    runningId,
    toggle,
    togglingId,
  };
}
