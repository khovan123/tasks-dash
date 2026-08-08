import { NextRequest, NextResponse } from "next/server";
import { GITHUB_ACCOUNT_CONFIRMATION_COOKIE } from "@/features/auth/constants";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(GITHUB_ACCOUNT_CONFIRMATION_COOKIE, "", {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
