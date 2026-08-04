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
  AuthUserDocument,
  AuthUserHydratedDocument,
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
    @InjectModel(AuthUserDocument.name)
    private readonly users: Model<AuthUserHydratedDocument>,
    private readonly config: ConfigService,
    private readonly encryption: CredentialEncryptionService,
  ) {}

  async accessTokenForMember(memberId: string): Promise<string> {
    const user = await this.users.findOne({ memberId }).exec();
    if (!user) {
      throw new UnauthorizedException(
        "GitHub user authorization is missing.",
      );
    }
    const expiry = user.githubAccessTokenExpiresAt?.getTime();
    if (!expiry || expiry > Date.now() + 60_000) {
      return this.encryption.decrypt(user.encryptedGithubAccessToken);
    }
    if (
      !user.encryptedGithubRefreshToken ||
      (user.githubRefreshTokenExpiresAt &&
        user.githubRefreshTokenExpiresAt.getTime() <= Date.now())
    ) {
      throw new UnauthorizedException(
        "GitHub user authorization expired. Sign in with GitHub again.",
      );
    }
    const refreshed = await this.exchange({
      grant_type: "refresh_token",
      refresh_token: this.encryption.decrypt(
        user.encryptedGithubRefreshToken,
      ),
    });
    user.encryptedGithubAccessToken = this.encryption.encrypt(
      refreshed.access_token!,
    );
    user.githubAccessTokenExpiresAt = expiresAt(refreshed.expires_in);
    if (refreshed.refresh_token) {
      user.encryptedGithubRefreshToken = this.encryption.encrypt(
        refreshed.refresh_token,
      );
      user.githubRefreshTokenExpiresAt = expiresAt(
        refreshed.refresh_token_expires_in,
      );
    }
    await user.save();
    return refreshed.access_token!;
  }

  async assertInstallationAccessible(
    memberId: string,
    installationId: number,
  ): Promise<void> {
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
    if (!response.ok) {
      throw new UnauthorizedException(
        "The GitHub App installation is not accessible to the signed-in user.",
      );
    }
    const installation = (await response.json()) as { app_id?: number };
    if (
      Number(installation.app_id) !==
      Number(this.config.getOrThrow<string>("GITHUB_APP_ID"))
    ) {
      throw new UnauthorizedException(
        "The installation belongs to a different GitHub App.",
      );
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
