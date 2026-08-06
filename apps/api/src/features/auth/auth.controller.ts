import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  Body,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { MEMBER_INVITATION_STATUSES } from "@tasks-dash/contracts";
import {
  WorkspaceInvitationDocument,
  WorkspaceInvitationHydratedDocument,
} from "../members/workspace-invitation.schema";
import { DiscordAdapter } from "../integrations/discord.adapter";
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
import {
  IntegrationOauthStateDocument,
  IntegrationOauthStateHydratedDocument,
} from "../integrations/integration.schemas";

const WORKSPACE_SETUP_PROVIDER = "workspace_setup";
const WORKSPACE_SETUP_CONTEXT = "pending_workspace";

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
    @InjectModel(IntegrationOauthStateDocument.name)
    private readonly oauthStates: Model<IntegrationOauthStateHydratedDocument>,
    @InjectModel(WorkspaceInvitationDocument.name)
    private readonly invitations: Model<WorkspaceInvitationHydratedDocument>,
    @Inject(forwardRef(() => DiscordAdapter))
    private readonly discord: DiscordAdapter,
  ) {}

  @PublicRoute()
  @Post("invite/validate-discord")
  async validateDiscordUsername(
    @Body("invite") inviteToken: string,
    @Body("discordUsername") discordUsername: string,
  ): Promise<{ ok: boolean }> {
    if (!inviteToken || !discordUsername) {
      throw new BadRequestException("Invite token and Discord username are required.");
    }
    const hash = createHash("sha256").update(inviteToken).digest("hex");
    const invitation = await this.invitations
      .findOne({
        tokenHash: hash,
        status: MEMBER_INVITATION_STATUSES.pending,
        expiresAt: { $gt: new Date() },
      })
      .exec();
    if (!invitation) {
      throw new BadRequestException("Lời mời không hợp lệ hoặc đã hết hạn.");
    }

    const exists = await this.discord.checkMemberInGuild(
      invitation.workspaceId,
      discordUsername,
    );
    if (!exists) {
      throw new BadRequestException(
        "Username Discord này không tồn tại. Vui lòng kiểm tra chính xác tên tài khoản của bạn.",
      );
    }

    return { ok: true };
  }

  @PublicRoute()
  @Get("github/login")
  async login(
    @Query("invite") inviteToken: string | undefined,
    @Query("discordUsername") discordUsername: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
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

    if (discordUsername) {
      response.cookie("discord_username", discordUsername, {
        ...this.sessions.cookieOptions(),
        maxAge: 15 * 60 * 1000,
      });
    } else {
      response.clearCookie("discord_username", this.sessions.cookieOptions());
    }

    await this.oauthStates.create({
      state,
      workspaceId: "auth_login",
      provider: "github",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
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
    const cookies = parseCookies(request.headers.cookie);
    const expectedFromCookie = cookies[OAUTH_STATE_COOKIE];
    let validState = false;

    if (state) {
      if (expectedFromCookie && expectedFromCookie === state) {
        validState = true;
        await this.oauthStates.deleteOne({ state, provider: "github" }).exec();
      } else {
        const dbState = await this.oauthStates
          .findOneAndDelete({ state, provider: "github" })
          .exec();
        if (dbState && dbState.expiresAt > new Date()) {
          validState = true;
        }
      }
    }

    if (!code || !state || !validState) {
      throw new UnauthorizedException("Invalid GitHub OAuth state.");
    }
    response.clearCookie(OAUTH_STATE_COOKIE, this.sessions.cookieOptions());

    const token = await this.githubTokens.exchange({
      code,
      redirect_uri: this.config.getOrThrow<string>("GITHUB_OAUTH_CALLBACK_URL"),
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
      throw new UnauthorizedException(
        "Unable to load the GitHub user profile.",
      );
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
    const discordUsername = cookies["discord_username"];
    const member = invitationToken
      ? await this.members.acceptInvitation(
          invitationToken,
          normalizedEmail,
          { ...profile, discordUsername },
          identityId,
          githubUser.id,
        )
      : await this.members.resolveLoginMembership(
          identityId,
          identity.lastWorkspaceId,
        );

    response.clearCookie(INVITATION_COOKIE, this.sessions.cookieOptions());
    response.clearCookie("discord_username", this.sessions.cookieOptions());

    if (!member) {
      const setupToken = randomBytes(32).toString("base64url");
      await this.oauthStates.create({
        state: setupToken,
        workspaceId: WORKSPACE_SETUP_CONTEXT,
        memberId: identityId,
        provider: WORKSPACE_SETUP_PROVIDER,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      const setupUrl = new URL(
        "/workspaces/new",
        this.config.getOrThrow<string>("WEB_APP_URL"),
      );
      setupUrl.searchParams.set("setup", setupToken);
      response.redirect(setupUrl.toString());
      return;
    }

    if (!invitationToken) {
      await this.members.touchLogin(member, profile);
    }

    identity.lastWorkspaceId = member.workspaceId;
    await identity.save();

    const memberId = String(member._id);
    const sessionToken = this.sessions.sign({
      identityId,
      memberId,
      userId: memberId,
      githubId: identity.githubId,
      login: identity.login,
      name: identity.name,
      email: identity.email,
      avatarUrl: identity.avatarUrl,
      workspaceId: member.workspaceId,
    });
    response.cookie(
      SESSION_COOKIE,
      sessionToken,
      this.sessions.cookieOptions(),
    );

    const webAppUrlString = this.config.getOrThrow<string>("WEB_APP_URL");
    let targetUrl: string;
    try {
      const webAppUrl = new URL(webAppUrlString);
      if (
        webAppUrl.hostname === "localhost" ||
        webAppUrl.hostname === "127.0.0.1"
      ) {
        webAppUrl.pathname = "/api/auth/session-sync";
        webAppUrl.searchParams.set("token", sessionToken);
      }
      targetUrl = webAppUrl.toString();
    } catch {
      targetUrl = webAppUrlString;
    }
    response.redirect(targetUrl);
  }

  @Get("me")
  me(@CurrentSession() session: AuthSession): AuthSession {
    return session;
  }

  @PublicRoute()
  @Post("refresh")
  refresh(@Req() request: Request, @Res() response: Response): void {
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies[SESSION_COOKIE];
    if (!token) {
      throw new UnauthorizedException("Session cookie is missing.");
    }
    const nextToken = this.sessions.refresh(token);
    response.cookie(SESSION_COOKIE, nextToken, this.sessions.cookieOptions());
    response.status(200).json({ ok: true });
  }

  @Post("logout")
  logout(@Res() response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.sessions.cookieOptions());
    response.status(204).send();
  }
}
