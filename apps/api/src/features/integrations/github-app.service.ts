import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { createSign, randomBytes } from "node:crypto";
import { GithubUserTokenService } from "../auth/github-user-token.service";
import { ProjectsService } from "../projects/projects.service";
import {
  GithubInstallationDocument,
  GithubInstallationHydratedDocument,
  IntegrationOauthStateDocument,
  IntegrationOauthStateHydratedDocument,
} from "./integration.schemas";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";

export interface GithubInstallationResponse {
  id: number;
  account: { login: string; type: string };
  repository_selection: string;
  suspended_at: string | null;
}

export interface GithubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  owner?: { login?: string };
  linkedProjectKey?: string;
}

@Injectable()
export class GithubAppService {
  constructor(
    private readonly config: ConfigService,
    @InjectModel(GithubInstallationDocument.name)
    private readonly installations: Model<GithubInstallationHydratedDocument>,
    private readonly projects: ProjectsService,
    private readonly userTokens: GithubUserTokenService,
  ) {}

  installationUrl(state: string): string {
    const url = new URL(
      `https://github.com/apps/${this.config.getOrThrow<string>(
        "GITHUB_APP_SLUG",
      )}/installations/new`,
    );
    url.searchParams.set("state", state);
    return url.toString();
  }

  private privateKey(): string {
    const base64 = this.config
      .get<string>("GITHUB_APP_PRIVATE_KEY_BASE64")
      ?.trim();
    return base64
      ? Buffer.from(base64, "base64").toString("utf8")
      : this.config
          .getOrThrow<string>("GITHUB_APP_PRIVATE_KEY")
          .replace(/\\n/g, "\n");
  }

  private jwt(): string {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iat: now - 60,
        exp: now + 540,
        iss: this.config.getOrThrow<string>("GITHUB_APP_ID"),
      }),
    ).toString("base64url");
    const unsigned = `${header}.${payload}`;
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    return `${unsigned}.${signer.sign(this.privateKey()).toString("base64url")}`;
  }

  private headers(token: string): Record<string, string> {
    return {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": GITHUB_API_VERSION,
      "user-agent": "tasks-dash",
    };
  }

  private async token(installationId: number): Promise<string> {
    const response = await fetch(
      `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
      { method: "POST", headers: this.headers(this.jwt()) },
    );
    const body = (await response.json().catch(() => ({}))) as {
      token?: string;
    };
    if (!response.ok || !body.token) {
      throw new ServiceUnavailableException(
        `GitHub installation token request failed with HTTP ${response.status}.`,
      );
    }
    return body.token;
  }

  private async installationRepositories(
    installationId: number,
  ): Promise<GithubRepositoryResponse[]> {
    const token = await this.token(installationId);
    const all: GithubRepositoryResponse[] = [];
    for (let page = 1; page <= 10; page += 1) {
      const response = await fetch(
        `${GITHUB_API}/installation/repositories?per_page=100&page=${page}`,
        { headers: this.headers(token) },
      );
      if (!response.ok) {
        throw new ServiceUnavailableException(
          `GitHub repository listing failed with HTTP ${response.status}.`,
        );
      }
      const batch = (
        (await response.json()) as {
          repositories?: GithubRepositoryResponse[];
        }
      ).repositories ?? [];
      all.push(...batch);
      if (batch.length < 100) break;
    }
    return all;
  }

  async connectInstallation(
    workspaceId: string,
    installationId: number,
    memberId: string,
  ): Promise<Record<string, unknown>> {
    await this.userTokens.assertInstallationAccessible(memberId, installationId);
    const existing = await this.installations.findOne({ installationId }).exec();
    if (existing && existing.workspaceId !== workspaceId) {
      throw new ConflictException(
        "This GitHub App installation is already connected to another workspace.",
      );
    }
    const response = await fetch(
      `${GITHUB_API}/app/installations/${installationId}`,
      { headers: this.headers(this.jwt()) },
    );
    if (!response.ok) {
      throw new UnauthorizedException(
        "The GitHub App installation could not be verified.",
      );
    }
    const installation = (await response.json()) as GithubInstallationResponse;
    const repositories = await this.installationRepositories(installationId);
    const stored = await this.installations
      .findOneAndUpdate(
        { installationId },
        {
          workspaceId,
          installationId,
          accountLogin: installation.account.login,
          accountType: installation.account.type,
          repositorySelection: installation.repository_selection,
          repositoryFullNames: repositories.map((item) => item.full_name),
          suspended: Boolean(installation.suspended_at),
          synchronizedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    return this.statusOf(stored);
  }

  async listStatus(workspaceId: string): Promise<Record<string, unknown>[]> {
    return (
      await this.installations
        .find({ workspaceId })
        .sort({ accountLogin: 1 })
        .exec()
    ).map((item) => this.statusOf(item));
  }

  async repositories(
    workspaceId: string,
  ): Promise<GithubRepositoryResponse[]> {
    const [installations, projects] = await Promise.all([
      this.installations.find({ workspaceId, suspended: false }).exec(),
      this.projects.list(workspaceId),
    ]);
    const batches = await Promise.all(
      installations.map(async (installation) => {
        const repositories = await this.installationRepositories(
          installation.installationId,
        );
        installation.repositoryFullNames = repositories.map(
          (item) => item.full_name,
        );
        installation.synchronizedAt = new Date();
        await installation.save();
        return repositories;
      }),
    );
    const linkedProjects = new Map(
      projects
        .filter((project) => Boolean(project.repositoryFullName))
        .map((project) => [
          project.repositoryFullName!.toLowerCase(),
          project.key,
        ]),
    );
    const unique = new Map<number, GithubRepositoryResponse>();
    for (const repository of batches.flat()) {
      unique.set(repository.id, {
        ...repository,
        linkedProjectKey: linkedProjects.get(repository.full_name.toLowerCase()),
      });
    }
    return [...unique.values()].sort((a, b) =>
      a.full_name.localeCompare(b.full_name),
    );
  }

  async linkProjectRepository(
    workspaceId: string,
    projectKey: string,
    repositoryId: number,
  ): Promise<Record<string, unknown>> {
    const repository = (await this.repositories(workspaceId)).find(
      (item) => item.id === repositoryId,
    );
    if (!repository) {
      throw new NotFoundException(
        "The selected repository is not available to this GitHub App installation.",
      );
    }
    if (
      repository.linkedProjectKey &&
      repository.linkedProjectKey !== projectKey.toUpperCase()
    ) {
      throw new ConflictException(
        `Repository ${repository.full_name} is already linked to project ${repository.linkedProjectKey}.`,
      );
    }
    const project = await this.projects.linkRepository(
      workspaceId,
      projectKey,
      repository.full_name,
    );
    return {
      projectKey: project.key,
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        htmlUrl: repository.html_url,
        private: repository.private,
        defaultBranch: repository.default_branch,
      },
    };
  }

  async unlinkProjectRepository(
    workspaceId: string,
    projectKey: string,
  ): Promise<Record<string, unknown>> {
    const project = await this.projects.unlinkRepository(workspaceId, projectKey);
    return { projectKey: project.key, repository: null };
  }

  async syncInstallation(installationId: number): Promise<void> {
    const installation = await this.installations
      .findOne({ installationId })
      .exec();
    if (!installation || installation.suspended) return;
    const repositories = await this.installationRepositories(installationId);
    installation.repositoryFullNames = repositories.map(
      (item) => item.full_name,
    );
    installation.synchronizedAt = new Date();
    await installation.save();
  }

  async createIssue(
    workspaceId: string,
    projectKey: string,
    title: string,
    body: string,
  ): Promise<Record<string, unknown>> {
    const project = await this.projects.getByKey(workspaceId, projectKey);
    if (!project.repositoryFullName) {
      throw new NotFoundException(
        `Project ${projectKey} has no GitHub repository.`,
      );
    }
    const installation = await this.installations
      .findOne({
        workspaceId,
        suspended: false,
        repositoryFullNames: project.repositoryFullName,
      })
      .exec();
    if (!installation) {
      throw new ServiceUnavailableException(
        "No GitHub App installation can access this repository.",
      );
    }
    const [owner, repo] = project.repositoryFullName.split("/");
    const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        ...this.headers(await this.token(installation.installationId)),
        "content-type": "application/json",
      },
      body: JSON.stringify({ title, body }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `GitHub issue creation failed with HTTP ${response.status}.`,
      );
    }
    return (await response.json()) as Record<string, unknown>;
  }

  findByInstallationId(
    installationId: number,
  ): Promise<GithubInstallationHydratedDocument | null> {
    return this.installations
      .findOne({ installationId, suspended: false })
      .exec();
  }

  async setSuspended(
    installationId: number,
    suspended: boolean,
  ): Promise<void> {
    await this.installations
      .updateOne({ installationId }, { suspended })
      .exec();
  }

  private statusOf(
    item: GithubInstallationDocument,
  ): Record<string, unknown> {
    return {
      installationId: item.installationId,
      accountLogin: item.accountLogin,
      accountType: item.accountType,
      repositorySelection: item.repositorySelection,
      repositoryCount: item.repositoryFullNames.length,
      repositories: item.repositoryFullNames,
      suspended: item.suspended,
      synchronizedAt: item.synchronizedAt ?? null,
    };
  }
}

@Injectable()
export class IntegrationStateService {
  constructor(
    @InjectModel(IntegrationOauthStateDocument.name)
    private readonly states: Model<IntegrationOauthStateHydratedDocument>,
  ) {}

  async create(workspaceId: string): Promise<string> {
    const state = randomBytes(32).toString("base64url");
    await this.states.create({
      state,
      workspaceId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return state;
  }

  async consume(state: string): Promise<string> {
    const stored = await this.states
      .findOneAndDelete({ state, expiresAt: { $gt: new Date() } })
      .exec();
    if (!stored) {
      throw new UnauthorizedException(
        "Integration state is invalid or expired.",
      );
    }
    return stored.workspaceId;
  }
}
