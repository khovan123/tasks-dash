"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { DevelopmentPullRequest } from "@/features/development/types";

export function useProjectPullRequests(
  projectKey: string,
  initialPullRequests: DevelopmentPullRequest[],
) {
  const [pullRequests, setPullRequests] =
    useState<DevelopmentPullRequest[]>(initialPullRequests);
  const [loading, setLoading] = useState(false);

  async function refresh(): Promise<void> {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectKey}/development/pull-requests?force=true`,
      );
      if (!response.ok) throw new Error("Failed to load Pull Requests");
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: DevelopmentPullRequest[];
      };
      if (!payload.ok || !Array.isArray(payload.data)) {
        throw new Error("Invalid Pull Request response");
      }
      setPullRequests(payload.data);
      toast.success("Đã cập nhật danh sách Pull Request mới nhất");
    } catch {
      toast.error("Không thể cập nhật danh sách Pull Request");
    } finally {
      setLoading(false);
    }
  }

  return { loading, pullRequests, refresh };
}
