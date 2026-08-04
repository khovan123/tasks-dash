import "server-only";
export async function upstreamRequest(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = process.env.TASKS_DASH_API_BASE_URL;
  if (!baseUrl) throw new Error("TASKS_DASH_API_BASE_URL is required.");
  return fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { accept: "application/json", ...(init?.body ? { "content-type": "application/json" } : {}), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
}
