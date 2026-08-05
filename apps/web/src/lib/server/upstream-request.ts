import "server-only";

export async function upstreamRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl =
    process.env.TASKS_DASH_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000/api";
  return fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}
