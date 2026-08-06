import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  const token = request.nextUrl.searchParams.get("token");
  const redirectPath = request.nextUrl.searchParams.get("redirect") || "/";
  const redirectUrl = new URL(redirectPath, request.nextUrl.origin);
  const response = NextResponse.redirect(redirectUrl);

  if (token) {
    response.cookies.set("tasks_dash_session", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return response;
}
