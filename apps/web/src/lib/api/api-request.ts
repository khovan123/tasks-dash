import type { ApiResult } from "@tasks-dash/contracts";
export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); this.name = "ApiRequestError"; }
}
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}), ...(init?.headers ?? {}) } });
  if (response.status === 204) return undefined as T;
  const result = (await response.json().catch(() => null)) as ApiResult<T> | null;
  if (!result) throw new ApiRequestError(`API request failed with HTTP ${response.status}.`, response.status);
  if (!result.ok) throw new ApiRequestError(result.problem.detailKey, result.problem.status, result.problem.code);
  if (!response.ok) throw new ApiRequestError(`API request failed with HTTP ${response.status}.`, response.status);
  return result.data;
}
