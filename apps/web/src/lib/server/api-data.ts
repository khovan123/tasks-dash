import "server-only";
import { cookies } from "next/headers";
import { upstreamRequest } from "./upstream-request";
interface ApiSuccess<T> {
  ok: true;
  data: T;
}
interface ApiFailure {
  ok: false;
  problem?: { detailKey?: string; titleKey?: string; status?: number };
}

export class ApiDataError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiDataError";
  }
}

export async function apiResponse(path: string): Promise<Response> {
  const cookieStore = await cookies();
  return upstreamRequest(path, { headers: { cookie: cookieStore.toString() } });
}
export async function apiData<T>(path: string): Promise<T> {
  const response = await apiResponse(path);
  const body = (await response.json().catch(() => null)) as
    ApiSuccess<T> | ApiFailure | null;
  if (!response.ok || !body || body.ok !== true) {
    const failure = body as ApiFailure | null;
    throw new ApiDataError(
      failure?.problem?.detailKey ??
        `API request failed with HTTP ${response.status}.`,
      failure?.problem?.status ?? response.status,
    );
  }
  return body.data;
}
