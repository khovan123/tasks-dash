import { NextRequest, NextResponse } from "next/server";
import { upstreamRequest } from "@/lib/server/upstream-request";

export const dynamic = "force-dynamic";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function GET(request: NextRequest): Promise<Response> {
  const upstream = await upstreamRequest(
    `/auth/github/login${request.nextUrl.search}`,
    {
      method: "GET",
      redirect: "manual",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        origin: request.headers.get("origin") ?? request.nextUrl.origin,
        "x-request-id":
          request.headers.get("x-request-id") ?? crypto.randomUUID(),
      },
    },
  );

  const location = upstream.headers.get("location");
  if (!location || !REDIRECT_STATUSES.has(upstream.status)) {
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const target = new URL(location);
  if (
    target.hostname === "github.com" &&
    target.pathname === "/login/oauth/authorize"
  ) {
    // GitHub otherwise auto-completes OAuth for an already-authorized account.
    // Force an explicit account choice after every Tasks Dash logout/login cycle.
    target.searchParams.set("prompt", "select_account");
  }

  const response = NextResponse.redirect(target, { status: upstream.status });
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}
