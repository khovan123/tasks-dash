import type { ApiResult } from "@tasks-dash/contracts";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function triggerRateLimitToast(msg: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("api-rate-limited", { detail: msg }),
    );
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 204) return undefined as T;
  const result = (await response
    .json()
    .catch(() => null)) as ApiResult<T> | null;
  if (!result) {
    if (response.status === 429) {
      triggerRateLimitToast("Bạn thao tác quá nhanh. Xin vui lòng đợi.");
    }
    throw new ApiRequestError(
      `API request failed with HTTP ${response.status}.`,
      response.status,
    );
  }
  if (!result.ok) {
    if (result.problem.status === 429) {
      triggerRateLimitToast(
        result.problem.detailKey || "Bạn thao tác quá nhanh. Xin vui lòng đợi.",
      );
    }
    throw new ApiRequestError(
      result.problem.detailKey,
      result.problem.status,
      result.problem.code,
    );
  }
  if (!response.ok) {
    if (response.status === 429) {
      triggerRateLimitToast("Bạn thao tác quá nhanh. Xin vui lòng đợi.");
    }
    throw new ApiRequestError(
      `API request failed with HTTP ${response.status}.`,
      response.status,
    );
  }
  return result.data;
}
