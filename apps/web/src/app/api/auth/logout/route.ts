import { NextRequest, NextResponse } from "next/server";
import { upstreamRequest } from "@/lib/server/upstream-request";

export const dynamic = "force-dynamic";

const AUTH_COOKIES = [
  "tasks_dash_session",
  "tasks_dash_oauth_state",
  "tasks_dash_invitation",
  "discord_username",
] as const;

export async function POST(request: NextRequest): Promise<Response> {
  const upstream = await upstreamRequest("/auth/logout", {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      origin: request.headers.get("origin") ?? request.nextUrl.origin,
      "x-request-id":
        request.headers.get("x-request-id") ?? crypto.randomUUID(),
    },
  });

  if (!upstream.ok) {
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  }

  const response = new NextResponse(null, { status: 204 });
  for (const cookie of upstream.headers.getSetCookie()) {
    response.headers.append("set-cookie", cookie);
  }
  for (const cookieName of AUTH_COOKIES) {
    response.cookies.delete(cookieName);
  }
  return response;
}
