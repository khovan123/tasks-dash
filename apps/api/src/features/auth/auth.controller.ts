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
import { Model } from "mongoose";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import {
  AuthSession,
  CurrentSession,
  PublicRoute,
} from "../../common/auth-context";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import { MembersService } from "../members/members.service";
import {
  AuthIdentityDocument,
  AuthIdentityHydratedDocument,
} from "./auth.schemas";
import {
  expiresAt,
  GITHUB_API_VERSION,
  GithubUserTokenService,
} from "./github-user-token.service";
import {
  INVITATION_COOKIE,
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
    private readonly members: MembersService,
    @InjectModel(AuthIdentityDocument.name)
    private readonly identities: Model<AuthIdentityHydratedDocument>,
  ) {}

  @PublicRoute()
  @Get("github/login")
  login(
    @Query("invite") inviteToken: string | undefined,
    @Res() response: Response,
  ): void {
    const state = randomBytes(32).toString("base64url");
    response.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.sessions.cookieOptions(),
      maxAge: 10 * 60 * 1000,
    });
    if (inviteToken) {
      if (inviteToken.length < 20 || inviteToken.length > 256) {
        throw new UnauthorizedException("Invalid workspace invitation token.");
      }
      response.cookie(INVITATION_COOKIE, inviteToken, {
        ...this.sessions.cookieOptions(),
        maxAge: 15 * 60 * 1000,
      });
    } else {
      response.clearCookie(INVITATION_COOKIE, this.sessions.cookieOptions());
    }
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
    const cookies = parseCookies(request.headers.cookie);
    const expected = Buffer.from(cookies[OAUTH_STATE_COOKIE] ?? "");
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
    const normalizedEmail = email.trim().toLowerCase();
    const profile = {
      name: githubUser.name ?? githubUser.login,
      avatarUrl: githubUser.avatar_url,
    };

    const identity = await this.identities
      .findOneAndUpdate(
        { githubId: githubUser.id },
        {
          $set: {
            githubId: githubUser.id,
            login: githubUser.login,
            name: profile.name,
            email: normalizedEmail,
            avatarUrl: profile.avatarUrl,
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
    const identityId = String(identity._id);

    await this.members.linkIdentityToExistingMemberships(
      identityId,
      githubUser.id,
      normalizedEmail,
    );

    const invitationToken = cookies[INVITATION_COOKIE];
    const member = invitationToken
      ? await this.members.acceptInvitation(
          invitationToken,
          normalizedEmail,
          profile,
          identityId,
          githubUser.id,
        )
      : await this.members.resolveLoginMembership(
          identityId,
          identity.lastWorkspaceId,
        );

    if (!member) {
      throw new UnauthorizedException(
        "A workspace invitation is required before GitHub login.",
      );
    }
    if (!invitationToken) {
      await this.members.touchLogin(member, profile);
    }
    response.clearCookie(INVITATION_COOKIE, this.sessions.cookieOptions());

    identity.lastWorkspaceId = member.workspaceId;
    await identity.save();

    const memberId = String(member._id);
    response.cookie(
      SESSION_COOKIE,
      this.sessions.sign({
        identityId,
        memberId,
        userId: memberId,
        githubId: identity.githubId,
        login: identity.login,
        name: identity.name,
        email: identity.email,
        avatarUrl: identity.avatarUrl,
        workspaceId: member.workspaceId,
      }),
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
