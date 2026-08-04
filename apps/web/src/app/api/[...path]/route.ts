import { NextRequest } from "next/server";
import { upstreamRequest } from "@/lib/server/upstream-request";
async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await context.params;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const response = await upstreamRequest(`/${path.join("/")}${request.nextUrl.search}`, {
    method: request.method,
    body,
    redirect: "manual",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      origin: request.headers.get("origin") ?? request.nextUrl.origin,
      "x-request-id": request.headers.get("x-request-id") ?? crypto.randomUUID(),
    },
  });
  const headers = new Headers();
  headers.set("content-type", response.headers.get("content-type") ?? "application/json");
  const setCookie = response.headers.get("set-cookie"); if (setCookie) headers.set("set-cookie", setCookie);
  const location = response.headers.get("location"); if (location) headers.set("location", location);
  return new Response(await response.text(), { status: response.status, headers });
}
export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
