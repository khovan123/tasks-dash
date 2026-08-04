import "server-only";
export async function upstreamRequest(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = process.env.TASKS_DASH_API_BASE_URL ?? "http://localhost:4000/api";
  return fetch(`${baseUrl}${path}`, { ...init, headers: { "content-type": "application/json", "x-workspace-id": "demo", ...(init?.headers ?? {}) }, cache: "no-store" });
}
