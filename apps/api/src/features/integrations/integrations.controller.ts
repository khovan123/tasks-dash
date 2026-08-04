import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  RawBodyRequest,
  Redirect,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  AuthSession,
  CurrentSession,
  PublicRoute,
  RequireRoles,
  WorkspaceId,
} from "../../common/auth-context";
import { DiscordAdapter } from "./discord.adapter";
import {
  GithubAppService,
  GithubRepositoryResponse,
  IntegrationStateService,
} from "./github-app.service";
import { GithubWebhookService } from "./github-webhook.service";
import { GoogleDriveAdapter } from "./google-drive.adapter";
import {
  ConnectDiscordDto,
  DiscordMessageDto,
  LinkGithubRepositoryDto,
} from "./integration.schemas";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly webhook: GithubWebhookService,
    private readonly github: GithubAppService,
    private readonly drive: GoogleDriveAdapter,
    private readonly discord: DiscordAdapter,
    private readonly states: IntegrationStateService,
    private readonly config: ConfigService,
  ) {}

  @Get("github/status")
  githubStatus(
    @WorkspaceId() workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.github.listStatus(workspaceId);
  }

  @Get("github/install")
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
  @Redirect()
  async githubInstall(
    @WorkspaceId() workspaceId: string,
  ): Promise<{ url: string; statusCode: number }> {
    const state = await this.states.create(workspaceId);
    return { url: this.github.installationUrl(state), statusCode: 302 };
  }

  @Get("github/setup")
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
  async githubSetup(
    @Query("installation_id") value: string,
    @Query("state") state: string,
    @CurrentSession() session: AuthSession,
    @Res() response: Response,
  ): Promise<void> {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0 || !state) {
      throw new UnauthorizedException(
        "A valid GitHub installation response is required.",
      );
    }
    const workspaceId = await this.states.consume(state);
    await this.github.connectInstallation(workspaceId, id, session.userId);
    response.redirect(
      `${this.config.getOrThrow<string>(
        "WEB_APP_URL",
      )}/settings/integrations?github=connected`,
    );
  }

  @Get("github/repositories")
  githubRepositories(
    @WorkspaceId() workspaceId: string,
  ): Promise<GithubRepositoryResponse[]> {
    return this.github.repositories(workspaceId);
  }

  @Patch("github/projects/:projectKey/repository")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
  )
  linkGithubRepository(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Body() body: LinkGithubRepositoryDto,
  ): Promise<Record<string, unknown>> {
    return this.github.linkProjectRepository(
      workspaceId,
      projectKey,
      body.repositoryId,
    );
  }

  @Delete("github/projects/:projectKey/repository")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
  )
  unlinkGithubRepository(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
  ): Promise<Record<string, unknown>> {
    return this.github.unlinkProjectRepository(workspaceId, projectKey);
  }

  @PublicRoute()
  @Post("github/webhook")
  githubWebhook(
    @Req() request: RawBodyRequest<Request>,
  ): Promise<Record<string, unknown>> {
    const delivery = String(request.headers["x-github-delivery"] ?? "");
    if (!delivery) {
      throw new UnauthorizedException("GitHub delivery id is required.");
    }
    this.webhook.verify(
      request.rawBody,
      request.headers["x-hub-signature-256"] as string | undefined,
    );
    return this.webhook.handle(
      delivery,
      String(request.headers["x-github-event"] ?? "unknown"),
      request.body as Record<string, unknown>,
    );
  }

  @Get("google-drive/status")
  driveStatus(
    @WorkspaceId() workspaceId: string,
  ): Promise<Record<string, unknown>> {
    return this.drive.status(workspaceId);
  }

  @Get("google-drive/connect")
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
  @Redirect()
  async driveConnect(
    @WorkspaceId() workspaceId: string,
  ): Promise<{ url: string; statusCode: number }> {
    return { url: await this.drive.connectUrl(workspaceId), statusCode: 302 };
  }

  @PublicRoute()
  @Get("google-drive/callback")
  async driveCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() response: Response,
  ): Promise<void> {
    if (!code || !state) {
      throw new UnauthorizedException("Google OAuth callback is incomplete.");
    }
    await this.drive.callback(code, state);
    response.redirect(
      `${this.config.getOrThrow<string>(
        "WEB_APP_URL",
      )}/settings/integrations?googleDrive=connected`,
    );
  }

  @Get("google-drive/projects/:projectKey/tree")
  driveTree(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
  ): Promise<Record<string, unknown>> {
    return this.drive.listTree(workspaceId, projectKey);
  }

  @Get("discord/status")
  discordStatus(
    @WorkspaceId() workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.discord.list(workspaceId);
  }

  @Post("discord/connect")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
  )
  discordConnect(
    @WorkspaceId() workspaceId: string,
    @Body() body: ConnectDiscordDto,
  ): Promise<Record<string, unknown>> {
    return this.discord.connect(workspaceId, body);
  }

  @Delete("discord/projects/:projectKey")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
  )
  async discordDisconnect(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
  ): Promise<void> {
    await this.discord.disconnect(workspaceId, projectKey);
  }

  @Post("discord/projects/:projectKey/test")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
  )
  async discordTest(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Body() body: DiscordMessageDto,
  ): Promise<{ delivered: boolean }> {
    await this.discord.send(
      workspaceId,
      projectKey,
      body.title,
      body.description,
    );
    return { delivered: true };
  }
}
