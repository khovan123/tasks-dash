import "server-only";

export async function upstreamRequest(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL || "http://127.0.0.1:4000/api";
  const url = `${baseUrl.replace(/\/$/, "")}${path}`;

  const maxAttempts = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(url, {
        ...init,
        headers: {
          accept: "application/json",
          "ngrok-skip-browser-warning": "true",
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        // Wait 500ms before retrying
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError;
}
