import "server-only";

export async function upstreamRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL || "http://127.0.0.1:4000/api";
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
