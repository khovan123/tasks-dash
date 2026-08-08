import { Controller, Post } from "@nestjs/common";
import { AuthSession, CurrentSession } from "../../common/auth-context";
import { GithubUserTokenService } from "./github-user-token.service";

@Controller("auth/github")
export class GithubAuthorizationController {
  constructor(private readonly githubTokens: GithubUserTokenService) {}

  @Post("revoke")
  async revoke(
    @CurrentSession() session: AuthSession,
  ): Promise<{ revoked: true }> {
    await this.githubTokens.revokeAuthorizationForIdentity(session.identityId);
    return { revoked: true };
  }
}
