import { ApiResult } from "@tasks-dash/contracts";
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(`${result.problem.code}: ${result.problem.detailKey}`);
  return result.data;
}
