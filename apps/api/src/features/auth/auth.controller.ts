import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { HydratedDocument, Model } from "mongoose";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { MEMBER_PRESENCE, MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  AuthSession,
  CurrentSession,
  PublicRoute,
} from "../../common/auth-context";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import { MemberDocument } from "../members/members.module";
import {
  AuthUserDocument,
  AuthUserHydratedDocument,
} from "./auth.schemas";
import {
  expiresAt,
  GITHUB_API_VERSION,
  GithubUserTokenService,
} from "./github-user-token.service";
import {
  OAUTH_STATE_COOKIE,
  parseCookies,
  SESSION_COOKIE,
  SessionService,
} from "./session.service";

interface GithubOAuthUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}
interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SessionService,
    private readonly githubTokens: GithubUserTokenService,
    private readonly encryption: CredentialEncryptionService,
    @InjectModel(AuthUserDocument.name)
    private readonly users: Model<AuthUserHydratedDocument>,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<HydratedDocument<MemberDocument>>,
  ) {}

  @PublicRoute()
  @Get("github/login")
  login(@Res() response: Response): void {
    const state = randomBytes(32).toString("base64url");
    response.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.sessions.cookieOptions(),
      maxAge: 10 * 60 * 1000,
    });
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set(
      "client_id",
      this.config.getOrThrow<string>("GITHUB_OAUTH_CLIENT_ID"),
    );
    authorize.searchParams.set(
      "redirect_uri",
      this.config.getOrThrow<string>("GITHUB_OAUTH_CALLBACK_URL"),
    );
    authorize.searchParams.set("state", state);
    response.redirect(authorize.toString());
  }

  @PublicRoute()
  @Get("github/callback")
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const cookieState = parseCookies(request.headers.cookie)[OAUTH_STATE_COOKIE];
    const expected = Buffer.from(cookieState ?? "");
    const actual = Buffer.from(state ?? "");
    if (
      !code ||
      !state ||
      expected.length === 0 ||
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      throw new UnauthorizedException("Invalid GitHub OAuth state.");
    }
    response.clearCookie(OAUTH_STATE_COOKIE, this.sessions.cookieOptions());

    const token = await this.githubTokens.exchange({
      code,
      redirect_uri: this.config.getOrThrow<string>(
        "GITHUB_OAUTH_CALLBACK_URL",
      ),
    });
    const githubHeaders = {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token.access_token}`,
      "x-github-api-version": GITHUB_API_VERSION,
      "user-agent": "tasks-dash",
    };
    const [userResponse, emailsResponse] = await Promise.all([
      fetch("https://api.github.com/user", { headers: githubHeaders }),
      fetch("https://api.github.com/user/emails", { headers: githubHeaders }),
    ]);
    if (!userResponse.ok) {
      throw new UnauthorizedException("Unable to load the GitHub user profile.");
    }
    const githubUser = (await userResponse.json()) as GithubOAuthUser;
    const emails = emailsResponse.ok
      ? ((await emailsResponse.json()) as GithubEmail[])
      : [];
    const email =
      emails.find((item) => item.primary && item.verified)?.email ??
      githubUser.email;
    if (!email) {
      throw new UnauthorizedException(
        "A verified GitHub email address is required.",
      );
    }
    const normalizedEmail = email.toLowerCase();
    const existing = await this.users.findOne({ githubId: githubUser.id }).exec();
    const existingMember = existing
      ? await this.members
          .findOne({ _id: existing.memberId, workspaceId: existing.workspaceId })
          .exec()
      : null;
    if (existing && !existingMember) {
      throw new UnauthorizedException(
        "Workspace membership is no longer active.",
      );
    }
    const invitedMember =
      existingMember ??
      (await this.members
        .findOne({ email: normalizedEmail })
        .sort({ createdAt: 1 })
        .exec());
    const workspaceId =
      existing?.workspaceId ??
      invitedMember?.workspaceId ??
      `ws_github_${githubUser.id}`;

    const member =
      invitedMember ??
      (await this.members.create({
        workspaceId,
        name: githubUser.name ?? githubUser.login,
        email: normalizedEmail,
        avatarUrl: githubUser.avatar_url,
        role: MEMBER_ROLES.owner,
        projectKeys: [],
        status: MEMBER_PRESENCE.online,
      }));
    if (invitedMember) {
      invitedMember.name = githubUser.name ?? githubUser.login;
      invitedMember.email = normalizedEmail;
      invitedMember.avatarUrl = githubUser.avatar_url;
      invitedMember.status = MEMBER_PRESENCE.online;
      await invitedMember.save();
    }

    const user = await this.users
      .findOneAndUpdate(
        { githubId: githubUser.id },
        {
          $set: {
            githubId: githubUser.id,
            login: githubUser.login,
            name: githubUser.name ?? githubUser.login,
            email: normalizedEmail,
            avatarUrl: githubUser.avatar_url,
            workspaceId,
            memberId: String(member._id),
            encryptedGithubAccessToken: this.encryption.encrypt(
              token.access_token!,
            ),
            githubAccessTokenExpiresAt: expiresAt(token.expires_in),
            lastLoginAt: new Date(),
            ...(token.refresh_token
              ? {
                  encryptedGithubRefreshToken: this.encryption.encrypt(
                    token.refresh_token,
                  ),
                  githubRefreshTokenExpiresAt: expiresAt(
                    token.refresh_token_expires_in,
                  ),
                }
              : {}),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    const sessionToken = this.sessions.sign({
      userId: String(member._id),
      githubId: user.githubId,
      login: user.login,
      name: user.name,
      avatarUrl: user.avatarUrl,
      workspaceId: user.workspaceId,
    });
    response.cookie(
      SESSION_COOKIE,
      sessionToken,
      this.sessions.cookieOptions(),
    );
    response.redirect(this.config.getOrThrow<string>("WEB_APP_URL"));
  }

  @Get("me")
  me(@CurrentSession() session: AuthSession): AuthSession {
    return session;
  }

  @Post("logout")
  logout(@Res() response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.sessions.cookieOptions());
    response.status(204).send();
  }
}
