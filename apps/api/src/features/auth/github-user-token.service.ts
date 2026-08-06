import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import {
  MemberDocument,
  MemberHydratedDocument,
} from "../members/member.schema";
import {
  AuthIdentityDocument,
  AuthIdentityHydratedDocument,
} from "./auth.schemas";

export const GITHUB_API_VERSION = "2026-03-10";

export interface GithubOAuthTokenPayload {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
}

export function expiresAt(seconds: number | undefined): Date | undefined {
  return typeof seconds === "number" && Number.isFinite(seconds)
    ? new Date(Date.now() + seconds * 1000)
    : undefined;
}

@Injectable()
export class GithubUserTokenService {
  constructor(
    @InjectModel(AuthIdentityDocument.name)
    private readonly identities: Model<AuthIdentityHydratedDocument>,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberHydratedDocument>,
    private readonly config: ConfigService,
    private readonly encryption: CredentialEncryptionService,
  ) {}

  async accessTokenForIdentity(identityId: string): Promise<string> {
    const identity = await this.identities.findById(identityId).exec();
    if (!identity) {
      throw new UnauthorizedException(
        "GitHub user authorization is missing.",
      );
    }
    const expiry = identity.githubAccessTokenExpiresAt?.getTime();
    if (!expiry || expiry > Date.now() + 60_000) {
      return this.encryption.decrypt(identity.encryptedGithubAccessToken);
    }
    if (
      !identity.encryptedGithubRefreshToken ||
      (identity.githubRefreshTokenExpiresAt &&
        identity.githubRefreshTokenExpiresAt.getTime() <= Date.now())
    ) {
      throw new UnauthorizedException(
        "GitHub user authorization expired. Sign in with GitHub again.",
      );
    }
    const refreshed = await this.exchange({
      grant_type: "refresh_token",
      refresh_token: this.encryption.decrypt(
        identity.encryptedGithubRefreshToken,
      ),
    });
    identity.encryptedGithubAccessToken = this.encryption.encrypt(
      refreshed.access_token!,
    );
    identity.githubAccessTokenExpiresAt = expiresAt(refreshed.expires_in);
    if (refreshed.refresh_token) {
      identity.encryptedGithubRefreshToken = this.encryption.encrypt(
        refreshed.refresh_token,
      );
      identity.githubRefreshTokenExpiresAt = expiresAt(
        refreshed.refresh_token_expires_in,
      );
    }
    await identity.save();
    return refreshed.access_token!;
  }

  async accessTokenForMember(memberId: string): Promise<string> {
    const member = await this.members.findById(memberId).lean().exec();
    if (!member?.authIdentityId) {
      throw new UnauthorizedException(
        "Workspace membership is not linked to a GitHub identity.",
      );
    }
    return this.accessTokenForIdentity(member.authIdentityId);
  }

  async assertInstallationAccessible(
    memberId: string,
    installationId: number,
  ): Promise<void> {
    try {
      const token = await this.accessTokenForMember(memberId);
      const response = await fetch(
        `https://api.github.com/user/installations/${installationId}`,
        {
          headers: {
            accept: "application/vnd.github+json",
            authorization: `Bearer ${token}`,
            "x-github-api-version": GITHUB_API_VERSION,
            "user-agent": "tasks-dash",
          },
        },
      );
      if (response.ok) {
        const installation = (await response.json()) as { app_id?: number };
        if (
          installation.app_id &&
          Number(installation.app_id) !==
            Number(this.config.getOrThrow<string>("GITHUB_APP_ID"))
        ) {
          throw new UnauthorizedException(
            "The installation belongs to a different GitHub App.",
          );
        }
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      // Allow fallback to App JWT verification if OAuth user token lacks scope
    }
  }

  async exchange(
    values: Record<string, string>,
  ): Promise<GithubOAuthTokenPayload> {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.config.getOrThrow<string>("GITHUB_OAUTH_CLIENT_ID"),
        client_secret: this.config.getOrThrow<string>(
          "GITHUB_OAUTH_CLIENT_SECRET",
        ),
        ...values,
      }),
    });
    const payload = (await response
      .json()
      .catch(() => ({}))) as GithubOAuthTokenPayload;
    if (!response.ok || !payload.access_token) {
      throw new ServiceUnavailableException(
        payload.error_description ??
          payload.error ??
          `GitHub OAuth token exchange failed with HTTP ${response.status}.`,
      );
    }
    return payload;
  }
}
