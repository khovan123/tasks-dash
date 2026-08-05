import { NextRequest } from "next/server";
import { upstreamRequest } from "@/lib/server/upstream-request";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const headers: Record<string, string> = {
    cookie: request.headers.get("cookie") ?? "",
    origin: request.headers.get("origin") ?? request.nextUrl.origin,
    "x-request-id":
      request.headers.get("x-request-id") ?? crypto.randomUUID(),
  };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  const response = await upstreamRequest(
    `/${path.join("/")}${request.nextUrl.search}`,
    {
      method: request.method,
      body,
      redirect: "manual",
      headers,
    },
  );
  const responseHeaders = new Headers();
  responseHeaders.set(
    "content-type",
    response.headers.get("content-type") ?? "application/json",
  );
  const setCookies = response.headers.getSetCookie();
  for (const cookie of setCookies) {
    responseHeaders.append("set-cookie", cookie);
  }
  const location = response.headers.get("location");
  if (location) responseHeaders.set("location", location);
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
