import { NextRequest, NextResponse } from "next/server";
import { GITHUB_ACCOUNT_CONFIRMATION_COOKIE } from "@/features/auth/constants";
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
    target.searchParams.set("prompt", "select_account");
  }

  const response = NextResponse.redirect(target, { status: upstream.status });
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }

  // Regular sign-in must never drop straight into a workspace after GitHub
  // returns. The selected account is explicitly confirmed in the app first.
  // Invitation flows keep their existing GitHub -> Discord onboarding flow.
  if (!request.nextUrl.searchParams.has("invite")) {
    response.cookies.set(GITHUB_ACCOUNT_CONFIRMATION_COOKIE, "1", {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });
  }

  return response;
}
