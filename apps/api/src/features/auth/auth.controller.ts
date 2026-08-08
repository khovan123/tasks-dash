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
import {
  MEMBER_INVITATION_STATUSES,
  MEMBER_ROLES,
} from "@tasks-dash/contracts";
import {
  WorkspaceInvitationDocument,
  WorkspaceInvitationHydratedDocument,
} from "../members/workspace-invitation.schema";
import { DiscordAdapter } from "../integrations/discord.adapter";
import {
  AuthSession,
  CurrentSession,
  PublicRoute,
  RequireRoles,
} from "../../common/auth-context";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import { MembersService } from "../members/members.service";
import {
  AuthIdentityDocument,
  AuthIdentityHydratedDocument,
  AuthLoginCodeDocument,
  AuthLoginCodeHydratedDocument,
} from "./auth.schemas";
import {
  expiresAt,
  GITHUB_API_VERSION,
  GithubOAuthTokenPayload,
  GithubUserTokenService,
} from "./github-user-token.service";
import {
  INVITATION_COOKIE,
  OAUTH_STATE_COOKIE,
  parseCookies,
  SESSION_COOKIE,
  SessionService,
} from "./session.service";
import { RedisService } from "../../common/redis.service";
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

interface IssueLoginCodeResponse {
  code: string;
  expiresAt: string;
}

interface RedeemLoginCodeResponse {
  redirectUrl: string;
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SessionService,
    private readonly githubTokens: GithubUserTokenService,
    private readonly encryption: CredentialEncryptionService,
    private readonly members: MembersService,
    private readonly redis: RedisService,
    @InjectModel(AuthIdentityDocument.name)
    private readonly identities: Model<AuthIdentityHydratedDocument>,
    @InjectModel(AuthLoginCodeDocument.name)
    private readonly loginCodes: Model<AuthLoginCodeHydratedDocument>,
    @InjectModel(IntegrationOauthStateDocument.name)
    private readonly oauthStates: Model<IntegrationOauthStateHydratedDocument>,
    @InjectModel(WorkspaceInvitationDocument.name)
    private readonly invitations: Model<WorkspaceInvitationHydratedDocument>,
    @Inject(forwardRef(() => DiscordAdapter))
    private readonly discord: DiscordAdapter,
  ) {}

  private createOneTimeLoginCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = randomBytes(9);
    const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
    return `TD-${chars.slice(0, 3).join("")}-${chars.slice(3, 6).join("")}-${chars.slice(6, 9).join("")}`;
  }

  private normalizeLoginCode(input: string | undefined): string {
    return (input ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  private loginCodeHash(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  private async fetchGithubIdentityProfile(accessToken: string): Promise<{
    githubUser: GithubOAuthUser;
    normalizedEmail: string;
    profile: { name: string; avatarUrl: string };
  }> {
    const githubHeaders = {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${accessToken}`,
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
    return {
      githubUser,
      normalizedEmail: email.trim().toLowerCase(),
      profile: {
        name: githubUser.name ?? githubUser.login,
        avatarUrl: githubUser.avatar_url,
      },
    };
  }

  private async upsertGithubIdentity(
    token: GithubOAuthTokenPayload,
    githubUser: GithubOAuthUser,
    normalizedEmail: string,
    profile: { name: string; avatarUrl: string },
  ): Promise<AuthIdentityHydratedDocument> {
    return this.identities
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
  }

  private buildAppRedirect(pathname: string): string {
    return new URL(
      pathname,
      this.config.getOrThrow<string>("WEB_APP_URL"),
    ).toString();
  }

  private buildSessionTarget(
    sessionToken: string,
    defaultPath: string,
  ): string {
    const webAppUrlString = this.config.getOrThrow<string>("WEB_APP_URL");
    try {
      const webAppUrl = new URL(webAppUrlString);
      if (
        webAppUrl.hostname === "localhost" ||
        webAppUrl.hostname === "127.0.0.1"
      ) {
        webAppUrl.pathname = "/api/auth/session-sync";
        webAppUrl.searchParams.set("token", sessionToken);
        webAppUrl.searchParams.set("redirect", defaultPath);
        return webAppUrl.toString();
      }
    } catch {
      return `${webAppUrlString.replace(/\/$/, "")}${defaultPath}`;
    }
    return new URL(defaultPath, webAppUrlString).toString();
  }

  private async completeLogin(
    response: Response,
    identity: AuthIdentityHydratedDocument,
    profile: { name: string; avatarUrl: string },
    invitationToken?: string,
    discordUsername?: string,
    preferDirectAppPath = false,
  ): Promise<string> {
    const identityId = String(identity._id);

    await this.members.linkIdentityToExistingMemberships(
      identityId,
      identity.githubId,
      identity.email,
      identity.login,
    );

    const member = invitationToken
      ? await this.members.acceptInvitation(
          invitationToken,
          identity.email,
          { ...profile, discordUsername },
          identityId,
          identity.githubId,
          identity.login,
        )
      : await this.members.resolveLoginMembership(
          identityId,
          identity.lastWorkspaceId,
        );

    if (invitationToken !== undefined) {
      response.clearCookie(INVITATION_COOKIE, this.sessions.cookieOptions());
      response.clearCookie("discord_username", this.sessions.cookieOptions());
    }

    if (!member) {
      const setupToken = randomBytes(32).toString("base64url");
      await this.oauthStates.create({
        state: setupToken,
        workspaceId: WORKSPACE_SETUP_CONTEXT,
        memberId: identityId,
        provider: WORKSPACE_SETUP_PROVIDER,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
      const setupPath = `/workspaces/new?setup=${encodeURIComponent(setupToken)}`;
      return preferDirectAppPath ? setupPath : this.buildAppRedirect(setupPath);
    }

    if (!invitationToken) {
      await this.members.touchLogin(member, profile, discordUsername);
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

    if (invitationToken || !member.discordUsername) {
      const state = randomBytes(32).toString("base64url");
      await this.oauthStates.create({
        state,
        workspaceId: member.workspaceId,
        memberId: memberId,
        provider: "discord_invite",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const authorize = new URL("https://discord.com/oauth2/authorize");
      authorize.searchParams.set(
        "client_id",
        this.config.getOrThrow<string>("DISCORD_APPLICATION_ID"),
      );
      authorize.searchParams.set(
        "redirect_uri",
        this.config.getOrThrow<string>("DISCORD_CALLBACK_URL"),
      );
      authorize.searchParams.set("response_type", "code");
      authorize.searchParams.set("scope", "identify guilds.join");
      authorize.searchParams.set("state", state);

      return authorize.toString();
    }

    return preferDirectAppPath
      ? "/workspaces"
      : this.buildSessionTarget(sessionToken, "/workspaces");
  }

  @PublicRoute()
  @Post("invite/validate-discord")
  async validateDiscordUsername(
    @Body("invite") inviteToken: string,
    @Body("discordUsername") discordUsername: string,
  ): Promise<{ ok: boolean }> {
    if (!inviteToken || !discordUsername) {
      throw new BadRequestException(
        "Invite token and Discord username are required.",
      );
    }
    const hash = createHash("sha256").update(inviteToken).digest("hex");
    const redis = this.redis.getClient();
    const cacheKey = `invite:hash:${hash}`;
    const cached = await redis.get(cacheKey);

    let invitation: any = null;
    if (cached) {
      invitation = JSON.parse(cached);
    } else {
      invitation = await this.invitations
        .findOne({
          tokenHash: hash,
          status: MEMBER_INVITATION_STATUSES.pending,
          expiresAt: { $gt: new Date() },
        })
        .exec();
      if (invitation) {
        await redis.set(cacheKey, JSON.stringify(invitation), "EX", 10 * 60);
      }
    }
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

  @Post("login-code/issue")
  async issueLoginCode(
    @CurrentSession() session: AuthSession,
  ): Promise<IssueLoginCodeResponse> {
    const identity = await this.identities.findById(session.identityId).exec();
    if (!identity) {
      throw new UnauthorizedException("Authenticated identity is missing.");
    }

    const code = this.createOneTimeLoginCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const codeHash = this.loginCodeHash(this.normalizeLoginCode(code));

    const redis = this.redis.getClient();
    const existingHashKey = `logincode:identity:${session.identityId}`;
    const oldHash = await redis.get(existingHashKey);
    if (oldHash) {
      await redis.del(`logincode:hash:${oldHash}`);
    }

    await redis.set(`logincode:hash:${codeHash}`, session.identityId, "EX", 15 * 60);
    await redis.set(existingHashKey, codeHash, "EX", 15 * 60);

    return {
      code,
      expiresAt: expiresAt.toISOString(),
    };
  }

  @PublicRoute()
  @Post("login-code/redeem")
  async redeemLoginCode(
    @Body("code") code: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RedeemLoginCodeResponse> {
    const normalizedCode = this.normalizeLoginCode(code);
    if (!normalizedCode) {
      throw new BadRequestException("One-time login code is required.");
    }

    const codeHash = this.loginCodeHash(normalizedCode);
    const redis = this.redis.getClient();
    const identityId = await redis.get(`logincode:hash:${codeHash}`);
    if (!identityId) {
      throw new UnauthorizedException(
        "Mã đăng nhập không hợp lệ hoặc đã được sử dụng.",
      );
    }

    // Clean up code from Redis (one-time use)
    await redis.del(`logincode:hash:${codeHash}`);
    await redis.del(`logincode:identity:${identityId}`);

    const identity = await this.identities
      .findById(identityId)
      .exec();
    if (!identity) {
      throw new UnauthorizedException(
        "Không tìm thấy tài khoản cho mã đăng nhập này.",
      );
    }

    return {
      redirectUrl: await this.completeLogin(
        response,
        identity,
        { name: identity.name, avatarUrl: identity.avatarUrl },
        undefined,
        undefined,
        true,
      ),
    };
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
    const { githubUser, normalizedEmail, profile } =
      await this.fetchGithubIdentityProfile(token.access_token!);
    const identity = await this.upsertGithubIdentity(
      token,
      githubUser,
      normalizedEmail,
      profile,
    );

    const invitationToken = cookies[INVITATION_COOKIE];
    const discordUsername = cookies["discord_username"];
    const targetUrl = await this.completeLogin(
      response,
      identity,
      profile,
      invitationToken,
      discordUsername,
    );
    response.redirect(targetUrl);
  }

  @Get("discord/login")
  async discordLogin(
    @CurrentSession() session: AuthSession,
    @Res() response: Response,
  ): Promise<void> {
    const state = randomBytes(32).toString("base64url");
    
    await this.oauthStates.create({
      state,
      workspaceId: session.workspaceId,
      memberId: session.userId,
      provider: "discord_user",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const authorize = new URL("https://discord.com/oauth2/authorize");
    authorize.searchParams.set(
      "client_id",
      this.config.getOrThrow<string>("DISCORD_APPLICATION_ID"),
    );
    authorize.searchParams.set(
      "redirect_uri",
      this.config.getOrThrow<string>("DISCORD_CALLBACK_URL"),
    );
    authorize.searchParams.set("response_type", "code");
    authorize.searchParams.set("scope", "identify guilds.join");
    authorize.searchParams.set("state", state);
    
    response.redirect(authorize.toString());
  }

  @PublicRoute()
  @Get("discord/callback")
  async discordCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const webUrl = this.config.getOrThrow<string>("WEB_APP_URL");

    if (!code || !state) {
      return response.redirect(`${webUrl}/settings/account?discord=error`);
    }

    const oauthState = await this.oauthStates
      .findOneAndDelete({
        state,
        provider: { $in: ["discord_user", "discord_invite"] },
      })
      .exec();

    if (!oauthState || oauthState.expiresAt < new Date()) {
      return response.redirect(`${webUrl}/settings/account?discord=stale`);
    }

    const isInviteFlow = oauthState.provider === "discord_invite";

    try {
      const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.getOrThrow<string>("DISCORD_APPLICATION_ID"),
          client_secret: this.config.getOrThrow<string>("DISCORD_CLIENT_SECRET"),
          grant_type: "authorization_code",
          code,
          redirect_uri: this.config.getOrThrow<string>("DISCORD_CALLBACK_URL"),
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed with HTTP ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json() as { access_token: string };

      const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
        headers: { authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user info with HTTP ${userResponse.status}`);
      }

      const discordUser = await userResponse.json() as { id: string; username: string };

      // Automatically add user to the Discord server
      await this.discord.addUserToGuild(
        oauthState.workspaceId,
        discordUser.id,
        tokens.access_token,
      );

      await this.members.updateMyProfile(
        oauthState.workspaceId,
        oauthState.memberId!,
        { discordUsername: discordUser.username },
      );

      if (isInviteFlow) {
        return response.redirect(`${webUrl}/workspaces`);
      }

      return response.redirect(`${webUrl}/settings/account?discord=success`);
    } catch (e) {
      console.error("Discord user OAuth failed:", e);
      if (isInviteFlow) {
        // Even if discord auth fails during invite, they accepted the workspace invite, so send them to /workspaces
        return response.redirect(`${webUrl}/workspaces?discord=failed`);
      }
      return response.redirect(`${webUrl}/settings/account?discord=failed`);
    }
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

  @PublicRoute()
  @Post("logout")
  logout(@Res() response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.sessions.cookieOptions());
    response.status(204).send();
  }
}
