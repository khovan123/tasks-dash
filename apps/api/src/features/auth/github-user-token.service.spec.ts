import { UnauthorizedException } from "@nestjs/common";
import { GithubUserTokenService } from "./github-user-token.service";

describe("GithubUserTokenService", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("revokes the GitHub app grant and clears stored user tokens", async () => {
    const identity = {
      _id: "identity-1",
      encryptedGithubAccessToken: "encrypted-access-token",
    };
    const execFind = jest.fn().mockResolvedValue(identity);
    const execUpdate = jest.fn().mockResolvedValue({ acknowledged: true });
    const identities = {
      findById: jest.fn().mockReturnValue({ exec: execFind }),
      updateOne: jest.fn().mockReturnValue({ exec: execUpdate }),
    };
    const members = {};
    const config = {
      getOrThrow: jest.fn((key: string) => {
        if (key === "GITHUB_OAUTH_CLIENT_ID") return "client-id";
        if (key === "GITHUB_OAUTH_CLIENT_SECRET") return "client-secret";
        throw new Error(`Unexpected config key: ${key}`);
      }),
    };
    const encryption = {
      decrypt: jest.fn().mockReturnValue("ghu_test_access_token"),
    };
    global.fetch = jest.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    ) as typeof fetch;

    const service = new GithubUserTokenService(
      identities as never,
      members as never,
      config as never,
      encryption as never,
    );

    await service.revokeAuthorizationForIdentity("identity-1");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.github.com/applications/client-id/grant",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ access_token: "ghu_test_access_token" }),
      }),
    );
    expect(identities.updateOne).toHaveBeenCalledWith(
      { _id: "identity-1" },
      {
        $unset: {
          encryptedGithubAccessToken: 1,
          encryptedGithubRefreshToken: 1,
          githubAccessTokenExpiresAt: 1,
          githubRefreshTokenExpiresAt: 1,
        },
      },
    );
  });

  it("rejects use of an identity whose GitHub grant was revoked", async () => {
    const identities = {
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: "identity-1" }),
      }),
    };
    const service = new GithubUserTokenService(
      identities as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(service.accessTokenForIdentity("identity-1")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
