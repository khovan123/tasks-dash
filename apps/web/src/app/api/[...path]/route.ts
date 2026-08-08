import { NextRequest, NextResponse } from "next/server";
import { upstreamRequest } from "@/lib/server/upstream-request";

export const dynamic = "force-dynamic";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await context.params;
  const pathStr = path.join("/");
  if (pathStr === "auth/logout") {
    // Intercept logout to clear NextJS-side cookie
    const upstreamRes = await upstreamRequest("/auth/logout", {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
    });
    const redirectResponse = NextResponse.json({ ok: true });
    const setCookies = upstreamRes.headers.getSetCookie();
    for (const cookie of setCookies) {
      redirectResponse.headers.append("set-cookie", cookie);
    }
    redirectResponse.cookies.delete("tasks_dash_session");
    return redirectResponse;
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const headers: Record<string, string> = {
    cookie: request.headers.get("cookie") ?? "",
    origin: request.headers.get("origin") ?? request.nextUrl.origin,
    "x-request-id": request.headers.get("x-request-id") ?? crypto.randomUUID(),
  };
  const accept = request.headers.get("accept");
  if (accept) headers.accept = accept;
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  let response = await upstreamRequest(
    `/${path.join("/")}${request.nextUrl.search}`,
    {
      method: request.method,
      body,
      redirect: "manual",
      headers,
    },
  );

  let newCookiesToSet: string[] = [];

  // Check for expired session (401) and attempt to silent refresh
  if (
    response.status === 401 &&
    pathStr !== "auth/login" &&
    pathStr !== "auth/refresh"
  ) {
    try {
      const refreshResponse = await upstreamRequest("/auth/refresh", {
        method: "POST",
        headers: {
          cookie: headers.cookie,
        },
      });

      if (refreshResponse.ok) {
        // Collect new session cookie from backend response
        const cookies = refreshResponse.headers.getSetCookie();
        newCookiesToSet = [...cookies];

        // Parse cookie header to append new session cookie for retry request
        const sessionCookie = cookies.find((c) =>
          c.startsWith("tasks_dash_session="),
        );
        if (sessionCookie) {
          const cookieVal = sessionCookie.split(";")[0];
          const existingCookies = headers.cookie
            .split(";")
            .filter((c) => !c.trim().startsWith("tasks_dash_session="));
          existingCookies.push(cookieVal);
          headers.cookie = existingCookies.join("; ");
        }

        // Retry the original request with the fresh session token
        response = await upstreamRequest(
          `/${path.join("/")}${request.nextUrl.search}`,
          {
            method: request.method,
            body,
            redirect: "manual",
            headers,
          },
        );
      } else {
        // Refresh failed (expired too long / invalid) -> Force logout
        const logoutResponse = NextResponse.json(
          {
            ok: false,
            problem: {
              status: 401,
              detailKey: "Session expired. Please log in again.",
            },
          },
          { status: 401 },
        );
        logoutResponse.cookies.delete("tasks_dash_session");
        return logoutResponse;
      }
    } catch (err) {
      console.error("Silent session refresh failed", err);
    }
  }

  const location = response.headers.get("location");
  if (
    location &&
    (response.status === 301 ||
      response.status === 302 ||
      response.status === 303 ||
      response.status === 307 ||
      response.status === 308)
  ) {
    const redirectResponse = NextResponse.redirect(location, {
      status: response.status,
    });
    const setCookies = [...newCookiesToSet, ...response.headers.getSetCookie()];
    for (const cookie of setCookies) {
      redirectResponse.headers.append("set-cookie", cookie);
    }
    return redirectResponse;
  }

  const isEventStream =
    response.headers.get("content-type")?.includes("text/event-stream") ||
    pathStr.endsWith("/sse");

  const responseHeaders = new Headers();
  responseHeaders.set(
    "content-type",
    response.headers.get("content-type") ?? "application/json",
  );
  if (isEventStream) {
    responseHeaders.set(
      "cache-control",
      response.headers.get("cache-control") ?? "no-cache, no-transform",
    );
    responseHeaders.set("x-accel-buffering", "no");
  }

  const setCookies = [...newCookiesToSet, ...response.headers.getSetCookie()];
  for (const cookie of setCookies) {
    responseHeaders.append("set-cookie", cookie);
  }

  if (isEventStream && response.body) {
    const reader = response.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (err) {
          controller.error(err);
        }
      },
      async cancel(reason) {
        await reader.cancel(reason);
      },
    });

    return new Response(stream, {
      status: response.status,
      headers: responseHeaders,
    });
  }

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
