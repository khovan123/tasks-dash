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
  RequireProjectAccess,
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
import {
  ConfigureDiscordWorkspaceDto,
  ConnectDiscordDto,
  DiscordMessageDto,
  LinkGithubRepositoryDto,
  ProvisionDiscordProjectDto,
} from "./integration.schemas";

@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly webhook: GithubWebhookService,
    private readonly github: GithubAppService,
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
  @RequireRoles(MEMBER_ROLES.owner)
  async githubInstall(
    @WorkspaceId() workspaceId: string,
    @Res() response: Response,
  ): Promise<void> {
    const state = await this.states.create(workspaceId);
    response.redirect(this.github.installationUrl(state));
  }

  @Get("github/setup")
  @RequireRoles(MEMBER_ROLES.owner)
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
      `${this.config.getOrThrow<string>("WEB_APP_URL")}/settings/integrations?github=connected`,
    );
  }

  @Get("github/repositories")
  githubRepositories(
    @WorkspaceId() workspaceId: string,
  ): Promise<GithubRepositoryResponse[]> {
    return this.github.repositories(workspaceId);
  }

  @Patch("github/projects/:projectKey/repository")
  @RequireProjectAccess()
  @RequireRoles(MEMBER_ROLES.owner)
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
  @RequireProjectAccess()
  @RequireRoles(MEMBER_ROLES.owner)
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
    if (!delivery)
      throw new UnauthorizedException("GitHub delivery id is required.");
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

  @Get("discord/workspace/status")
  discordWorkspaceStatus(
    @WorkspaceId() workspaceId: string,
  ): Promise<Record<string, unknown>> {
    return this.discord.workspaceStatus(workspaceId);
  }

  @Get("discord/install")
  @RequireRoles(MEMBER_ROLES.owner)
  async discordInstall(
    @WorkspaceId() workspaceId: string,
    @Res() response: Response,
  ): Promise<void> {
    const state = await this.states.create(workspaceId);
    response.redirect(this.discord.installUrl(state));
  }

  @Get("discord/setup")
  @RequireRoles(MEMBER_ROLES.owner)
  async discordSetup(
    @Query("guild_id") guildId: string,
    @Query("state") state: string,
    @Res() response: Response,
  ): Promise<void> {
    const webAppUrl = this.config.getOrThrow<string>("WEB_APP_URL");
    if (!guildId || !state) {
      return response.redirect(
        `${webAppUrl}/settings/integrations?discord=error`,
      );
    }
    try {
      const workspaceId = await this.states.consume(state);
      await this.discord.configureWorkspace(workspaceId, { guildId });
      return response.redirect(
        `${webAppUrl}/settings/integrations?discord=connected`,
      );
    } catch {
      return response.redirect(
        `${webAppUrl}/settings/integrations?discord=error`,
      );
    }
  }

  @Post("discord/workspace/configure")
  @RequireRoles(MEMBER_ROLES.owner)
  discordConfigureWorkspace(
    @WorkspaceId() workspaceId: string,
    @Body() body: ConfigureDiscordWorkspaceDto,
  ): Promise<Record<string, unknown>> {
    return this.discord.configureWorkspace(workspaceId, body);
  }

  @Post("discord/workspace/provision-all")
  @RequireRoles(MEMBER_ROLES.owner)
  discordProvisionAll(@WorkspaceId() workspaceId: string) {
    return this.discord.provisionAll(workspaceId);
  }

  @Delete("discord/workspace/channels")
  @RequireRoles(MEMBER_ROLES.owner)
  discordCleanWorkspaceChannels(
    @WorkspaceId() workspaceId: string,
  ): Promise<{ deletedChannelsCount: number; deletedCategoriesCount: number }> {
    return this.discord.cleanGuildChannels(workspaceId);
  }

  @Post("discord/projects/:projectKey/provision")
  @RequireProjectAccess()
  @RequireRoles(MEMBER_ROLES.owner)
  discordProvisionProject(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Body() body: ProvisionDiscordProjectDto,
  ): Promise<Record<string, unknown>> {
    return this.discord.provisionProject(workspaceId, projectKey, body);
  }

  @Get("discord/status")
  discordStatus(
    @WorkspaceId() workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.discord.list(workspaceId);
  }

  @Post("discord/connect")
  @RequireRoles(MEMBER_ROLES.owner)
  discordConnect(
    @WorkspaceId() workspaceId: string,
    @Body() body: ConnectDiscordDto,
  ): Promise<Record<string, unknown>> {
    return this.discord.connect(workspaceId, body);
  }

  @Delete("discord/projects/:projectKey")
  @RequireProjectAccess()
  @RequireRoles(MEMBER_ROLES.owner)
  async discordDisconnect(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
  ): Promise<void> {
    await this.discord.disconnect(workspaceId, projectKey);
  }

  @Get("discord/projects/:projectKey/channels")
  @RequireProjectAccess()
  discordProjectChannels(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
  ): Promise<Array<{ id: string; name: string }>> {
    return this.discord.getProjectChannels(workspaceId, projectKey);
  }

  @Post("discord/projects/:projectKey/test")
  @RequireProjectAccess()
  @RequireRoles(MEMBER_ROLES.owner)
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

  @PublicRoute()
  @Post("discord/interactions")
  async discordInteractions(
    @Req() request: RawBodyRequest<Request>,
    @Res() response: Response,
  ): Promise<any> {
    const signature = String(request.headers["x-signature-ed25519"] ?? "");
    const timestamp = String(request.headers["x-signature-timestamp"] ?? "");

    if (!signature || !timestamp) {
      throw new UnauthorizedException("Signature and timestamp are required.");
    }

    if (!request.rawBody) {
      throw new UnauthorizedException("Raw request body is required.");
    }

    const verified = this.discord.verifyInteractionSignature(
      request.rawBody,
      signature,
      timestamp,
    );

    if (!verified) {
      throw new UnauthorizedException("Invalid interaction signature.");
    }

    const result = await this.discord.handleInteraction(request.body);
    return response.status(200).json(result);
  }
}
