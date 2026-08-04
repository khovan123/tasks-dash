import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { AuthSession } from "../../common/auth-context";

export const SESSION_COOKIE = "tasks_dash_session";
export const OAUTH_STATE_COOKIE = "tasks_dash_oauth_state";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header.split(";").reduce<Record<string, string>>((cookies, entry) => {
    const separator = entry.indexOf("=");
    if (separator < 0) return cookies;
    const key = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function encodePart(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

@Injectable()
export class SessionService {
  constructor(private readonly config: ConfigService) {}

  private signature(value: string): string {
    return createHmac(
      "sha256",
      this.config.getOrThrow<string>("SESSION_SECRET"),
    )
      .update(value)
      .digest("base64url");
  }

  sign(input: Omit<AuthSession, "issuedAt" | "expiresAt">): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const session: AuthSession = {
      ...input,
      issuedAt,
      expiresAt: issuedAt + SESSION_DURATION_SECONDS,
    };
    const header = encodePart({ alg: "HS256", typ: "JWT" });
    const payload = encodePart(session);
    const unsigned = `${header}.${payload}`;
    return `${unsigned}.${this.signature(unsigned)}`;
  }

  verify(token: string | undefined): AuthSession {
    if (!token) throw new UnauthorizedException("Authentication is required.");
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) {
      throw new UnauthorizedException("Invalid session token.");
    }
    const unsigned = `${header}.${payload}`;
    const expected = Buffer.from(this.signature(unsigned));
    const actual = Buffer.from(signature);
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException("Invalid session signature.");
    }
    let session: AuthSession;
    try {
      session = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      ) as AuthSession;
    } catch {
      throw new UnauthorizedException("Invalid session payload.");
    }
    if (
      !session.workspaceId ||
      !session.userId ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      throw new UnauthorizedException("Session has expired.");
    }
    return session;
  }

  read(request: Request): AuthSession {
    return this.verify(parseCookies(request.headers.cookie)[SESSION_COOKIE]);
  }

  cookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    maxAge: number;
    path: string;
    domain?: string;
  } {
    const domain = this.config.get<string>("COOKIE_DOMAIN")?.trim();
    return {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS * 1000,
      path: "/",
      ...(domain ? { domain } : {}),
    };
  }
}
