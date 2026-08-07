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
import { ProjectPullRequestDocument } from "./project-pull-request.schema";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_MUTATION_STATES = {
  open: "open",
  closed: "closed",
} as const;
type GithubMutationState =
  (typeof GITHUB_MUTATION_STATES)[keyof typeof GITHUB_MUTATION_STATES];

const GITHUB_REVIEW_EVENTS = {
  approve: "APPROVE",
  requestChanges: "REQUEST_CHANGES",
} as const;
type GithubReviewEvent =
  (typeof GITHUB_REVIEW_EVENTS)[keyof typeof GITHUB_REVIEW_EVENTS];

const GITHUB_ALERT_STATES = {
  dismissed: "dismissed",
  open: "open",
} as const;
type GithubAlertState =
  (typeof GITHUB_ALERT_STATES)[keyof typeof GITHUB_ALERT_STATES];

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

export interface GithubPullRequestSummary {
  number: number;
  title: string;
  html_url: string;
  repositoryFullName: string;
  branch: string;
  author: string;
  state: string;
  draft: boolean;
}

export interface GithubIssueSummary {
  number: number;
  title: string;
  html_url: string;
  repositoryFullName: string;
  author: string;
  state: string;
}

export interface GithubWorkflowRunSummary {
  id: number;
  name: string;
  html_url: string;
  repositoryFullName: string;
  status: string;
  conclusion: string | null;
  branch: string;
  event: string;
  workflowName: string;
  createdAt: string | null;
}

export interface GithubCheckSuiteSummary {
  id: number;
  repositoryFullName: string;
  branch: string;
  headSha: string;
  status: string;
  conclusion: string | null;
  appName: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GithubDeploymentSummary {
  id: number;
  repositoryFullName: string;
  environment: string;
  ref: string;
  creator: string;
  state: string;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  originalEnvironment: string | null;
}

export interface GithubDependabotAlertSummary {
  number: number;
  repositoryFullName: string;
  state: string;
  severity: string;
  packageName: string;
  ecosystem: string;
  summary: string;
  html_url: string;
  createdAt: string | null;
}

export interface GithubCodeScanningAlertSummary {
  number: number;
  repositoryFullName: string;
  state: string;
  severity: string;
  rule: string;
  tool: string;
  html_url: string;
  createdAt: string | null;
}

@Injectable()
export class GithubAppService {
  private prsCache = new Map<string, { data: any[]; expiresAt: number }>();

  constructor(
    private readonly config: ConfigService,
    @InjectModel(GithubInstallationDocument.name)
    private readonly installations: Model<GithubInstallationHydratedDocument>,
    @InjectModel(ProjectPullRequestDocument.name)
    private readonly projectPrs: Model<ProjectPullRequestDocument>,
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
    const raw =
      this.config.get<string>("GITHUB_APP_PRIVATE_KEY_BASE64")?.trim() ||
      this.config.get<string>("GITHUB_APP_PRIVATE_KEY")?.trim() ||
      "";
    if (!raw) {
      throw new Error(
        "Neither GITHUB_APP_PRIVATE_KEY_BASE64 nor GITHUB_APP_PRIVATE_KEY is set in environment.",
      );
    }
    let key = raw;
    if (
      !key.includes("BEGIN RSA PRIVATE KEY") &&
      !key.includes("BEGIN PRIVATE KEY")
    ) {
      key = Buffer.from(key, "base64").toString("utf8");
    }
    if (key.includes("BEGIN RSA PRIVATE KEY")) {
      const header = "-----BEGIN RSA PRIVATE KEY-----";
      const footer = "-----END RSA PRIVATE KEY-----";
      if (key.includes(header) && key.includes(footer)) {
        const body = key
          .substring(key.indexOf(header) + header.length, key.indexOf(footer))
          .trim()
          .replace(/\s+/g, "\n");
        return `${header}\n${body}\n${footer}`;
      }
    }
    return key.replace(/\\n/g, "\n");
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
      const batch =
        (
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
    await this.userTokens.assertInstallationAccessible(
      memberId,
      installationId,
    );
    const existing = await this.installations
      .findOne({ installationId })
      .exec();
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

  async repositories(workspaceId: string): Promise<GithubRepositoryResponse[]> {
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
        linkedProjectKey: linkedProjects.get(
          repository.full_name.toLowerCase(),
        ),
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
    const project = await this.projects.unlinkRepository(
      workspaceId,
      projectKey,
    );
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
    return this.createIssueInRepository(
      workspaceId,
      project.repositoryFullName,
      title,
      body,
    );
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

  private statusOf(item: GithubInstallationDocument): Record<string, unknown> {
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

  private async installationForRepository(
    workspaceId: string,
    repositoryFullName: string,
  ): Promise<GithubInstallationHydratedDocument> {
    const installation = await this.installations
      .findOne({
        workspaceId,
        suspended: false,
        repositoryFullNames: repositoryFullName,
      })
      .exec();
    if (!installation) {
      throw new ServiceUnavailableException(
        `No GitHub App installation can access repository ${repositoryFullName}.`,
      );
    }
    return installation;
  }

  private async repositoryToken(
    workspaceId: string,
    repositoryFullName: string,
  ): Promise<string> {
    const installation = await this.installationForRepository(
      workspaceId,
      repositoryFullName,
    );
    return this.token(installation.installationId);
  }

  private async requestRepository<T>(
    workspaceId: string,
    repositoryFullName: string,
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const token = await this.repositoryToken(workspaceId, repositoryFullName);
    const headers = new Headers(init.headers);
    for (const [key, value] of Object.entries(this.headers(token))) {
      headers.set(key, value);
    }
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await fetch(`${GITHUB_API}${path}`, { ...init, headers });
    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new ServiceUnavailableException(
        errorData.message ??
          `GitHub API request failed with HTTP ${response.status}.`,
      );
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  private async resolveRepositories(
    workspaceId: string,
    projectKey?: string,
  ): Promise<string[]> {
    if (projectKey) {
      const project = await this.projects.getByKey(workspaceId, projectKey);
      if (!project?.repositoryFullName) {
        throw new NotFoundException(
          `Project ${projectKey} has no GitHub repository.`,
        );
      }
      return [project.repositoryFullName];
    }
    const installations = await this.installations
      .find({ workspaceId, suspended: false })
      .exec();
    return [
      ...new Set(installations.flatMap((item) => item.repositoryFullNames)),
    ];
  }

  async createIssueInRepository(
    workspaceId: string,
    repositoryFullName: string,
    title: string,
    body: string,
  ): Promise<Record<string, unknown>> {
    return this.requestRepository<Record<string, unknown>>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/issues`,
      {
        method: "POST",
        body: JSON.stringify({ title, body }),
      },
    );
  }

  async listOpenPullRequests(
    workspaceId: string,
    projectKey?: string,
  ): Promise<GithubPullRequestSummary[]> {
    const repositories = await this.resolveRepositories(
      workspaceId,
      projectKey,
    );
    const prs: GithubPullRequestSummary[] = [];
    for (const repositoryFullName of repositories) {
      try {
        const list = await this.requestRepository<any[]>(
          workspaceId,
          repositoryFullName,
          `/repos/${repositoryFullName}/pulls?state=open&per_page=50`,
        );
        for (const pr of list) {
          prs.push({
            number: pr.number,
            title: pr.title,
            html_url: pr.html_url,
            repositoryFullName,
            branch: pr.head?.ref ?? "?",
            author: pr.user?.login ?? "unknown",
            state: pr.state ?? "open",
            draft: Boolean(pr.draft),
          });
        }
      } catch (error) {
        console.error(
          `Failed to fetch PRs for repository ${repositoryFullName}:`,
          error,
        );
      }
    }
    return prs.sort(
      (a, b) =>
        a.repositoryFullName.localeCompare(b.repositoryFullName) ||
        a.number - b.number,
    );
  }

  async mergePullRequest(
    workspaceId: string,
    repositoryFullName: string,
    prNumber: number,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/pulls/${prNumber}/merge`,
      {
        method: "PUT",
        body: JSON.stringify({ merge_method: "merge" }),
      },
    );
  }

  async commentOnPullRequest(
    workspaceId: string,
    repositoryFullName: string,
    prNumber: number,
    commentBody: string,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/issues/${prNumber}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body: commentBody }),
      },
    );
  }

  async assignPullRequest(
    workspaceId: string,
    repositoryFullName: string,
    prNumber: number,
    assignee: string,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/issues/${prNumber}/assignees`,
      {
        method: "POST",
        body: JSON.stringify({ assignees: [assignee] }),
      },
    );
  }

  async requestReviewOnPullRequest(
    workspaceId: string,
    repositoryFullName: string,
    prNumber: number,
    reviewer: string,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/pulls/${prNumber}/requested_reviewers`,
      {
        method: "POST",
        body: JSON.stringify({ reviewers: [reviewer] }),
      },
    );
  }

  async submitPullRequestReview(
    workspaceId: string,
    repositoryFullName: string,
    prNumber: number,
    event: GithubReviewEvent,
    body?: string,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/pulls/${prNumber}/reviews`,
      {
        method: "POST",
        body: JSON.stringify({
          event,
          body: body?.trim() || undefined,
        }),
      },
    );
  }

  async updatePullRequestState(
    workspaceId: string,
    repositoryFullName: string,
    prNumber: number,
    state: GithubMutationState,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/pulls/${prNumber}`,
      {
        method: "PATCH",
        body: JSON.stringify({ state }),
      },
    );
  }

  async listOpenIssues(
    workspaceId: string,
    projectKey?: string,
  ): Promise<GithubIssueSummary[]> {
    const repositories = await this.resolveRepositories(
      workspaceId,
      projectKey,
    );
    const issues: GithubIssueSummary[] = [];
    for (const repositoryFullName of repositories) {
      try {
        const list = await this.requestRepository<any[]>(
          workspaceId,
          repositoryFullName,
          `/repos/${repositoryFullName}/issues?state=open&per_page=50`,
        );
        for (const issue of list) {
          if (issue.pull_request) continue;
          issues.push({
            number: issue.number,
            title: issue.title,
            html_url: issue.html_url,
            repositoryFullName,
            author: issue.user?.login ?? "unknown",
            state: issue.state ?? "open",
          });
        }
      } catch (error) {
        console.error(
          `Failed to fetch issues for repository ${repositoryFullName}:`,
          error,
        );
      }
    }
    return issues.sort(
      (a, b) =>
        a.repositoryFullName.localeCompare(b.repositoryFullName) ||
        a.number - b.number,
    );
  }

  async commentOnIssue(
    workspaceId: string,
    repositoryFullName: string,
    issueNumber: number,
    commentBody: string,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/issues/${issueNumber}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body: commentBody }),
      },
    );
  }

  async assignIssue(
    workspaceId: string,
    repositoryFullName: string,
    issueNumber: number,
    assignee: string,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/issues/${issueNumber}/assignees`,
      {
        method: "POST",
        body: JSON.stringify({ assignees: [assignee] }),
      },
    );
  }

  async updateIssueState(
    workspaceId: string,
    repositoryFullName: string,
    issueNumber: number,
    state: GithubMutationState,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/issues/${issueNumber}`,
      {
        method: "PATCH",
        body: JSON.stringify({ state }),
      },
    );
  }

  async listWorkflowRuns(
    workspaceId: string,
    projectKey?: string,
  ): Promise<GithubWorkflowRunSummary[]> {
    const repositories = await this.resolveRepositories(
      workspaceId,
      projectKey,
    );
    const runs: GithubWorkflowRunSummary[] = [];
    for (const repositoryFullName of repositories) {
      try {
        const payload = await this.requestRepository<{
          workflow_runs?: any[];
        }>(
          workspaceId,
          repositoryFullName,
          `/repos/${repositoryFullName}/actions/runs?per_page=25`,
        );
        for (const run of payload.workflow_runs ?? []) {
          runs.push({
            id: run.id,
            name: run.display_title ?? run.name ?? `Run #${run.id}`,
            html_url: run.html_url,
            repositoryFullName,
            status: run.status ?? "unknown",
            conclusion: run.conclusion ?? null,
            branch: run.head_branch ?? "?",
            event: run.event ?? "unknown",
            workflowName: run.name ?? "Workflow",
            createdAt: run.created_at ?? null,
          });
        }
      } catch (error) {
        console.error(
          `Failed to fetch workflow runs for repository ${repositoryFullName}:`,
          error,
        );
      }
    }
    return runs.sort((a, b) => {
      const left = a.createdAt ? Date.parse(a.createdAt) : 0;
      const right = b.createdAt ? Date.parse(b.createdAt) : 0;
      return right - left;
    });
  }

  async rerunWorkflowRun(
    workspaceId: string,
    repositoryFullName: string,
    runId: number,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/actions/runs/${runId}/rerun`,
      { method: "POST" },
    );
  }

  async cancelWorkflowRun(
    workspaceId: string,
    repositoryFullName: string,
    runId: number,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/actions/runs/${runId}/cancel`,
      { method: "POST" },
    );
  }

  async rerunFailedWorkflowJobs(
    workspaceId: string,
    repositoryFullName: string,
    runId: number,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/actions/runs/${runId}/rerun-failed-jobs`,
      { method: "POST" },
    );
  }

  async listCheckSuites(
    workspaceId: string,
    projectKey?: string,
  ): Promise<GithubCheckSuiteSummary[]> {
    const repositorySet = new Set(
      await this.resolveRepositories(workspaceId, projectKey),
    );
    const catalogs = (await this.repositories(workspaceId)).filter(
      (repository) => repositorySet.has(repository.full_name),
    );
    const suites: GithubCheckSuiteSummary[] = [];
    for (const repository of catalogs) {
      try {
        const payload = await this.requestRepository<{
          check_suites?: any[];
        }>(
          workspaceId,
          repository.full_name,
          `/repos/${repository.full_name}/commits/${encodeURIComponent(
            repository.default_branch,
          )}/check-suites?per_page=25`,
        );
        for (const suite of payload.check_suites ?? []) {
          suites.push({
            id: suite.id,
            repositoryFullName: repository.full_name,
            branch: suite.head_branch ?? repository.default_branch,
            headSha: suite.head_sha ?? "",
            status: suite.status ?? "unknown",
            conclusion: suite.conclusion ?? null,
            appName: suite.app?.name ?? "GitHub",
            createdAt: suite.created_at ?? null,
            updatedAt: suite.updated_at ?? null,
          });
        }
      } catch (error) {
        console.error(
          `Failed to fetch check suites for repository ${repository.full_name}:`,
          error,
        );
      }
    }
    return suites.sort((a, b) => {
      const left = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const right = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return right - left;
    });
  }

  async rerequestCheckSuite(
    workspaceId: string,
    repositoryFullName: string,
    checkSuiteId: number,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/check-suites/${checkSuiteId}/rerequest`,
      { method: "POST" },
    );
  }

  async listDeployments(
    workspaceId: string,
    projectKey?: string,
  ): Promise<GithubDeploymentSummary[]> {
    const repositories = await this.resolveRepositories(
      workspaceId,
      projectKey,
    );
    const deployments: GithubDeploymentSummary[] = [];
    for (const repositoryFullName of repositories) {
      try {
        const list = await this.requestRepository<any[]>(
          workspaceId,
          repositoryFullName,
          `/repos/${repositoryFullName}/deployments?per_page=25`,
        );
        for (const deployment of list) {
          let latestStatus: any = null;
          try {
            const statuses = await this.requestRepository<any[]>(
              workspaceId,
              repositoryFullName,
              `/repos/${repositoryFullName}/deployments/${deployment.id}/statuses?per_page=1`,
            );
            latestStatus = statuses[0] ?? null;
          } catch (statusError) {
            console.error(
              `Failed to fetch deployment status for repository ${repositoryFullName} deployment ${deployment.id}:`,
              statusError,
            );
          }
          deployments.push({
            id: deployment.id,
            repositoryFullName,
            environment:
              latestStatus?.environment ?? deployment.environment ?? "unknown",
            ref: deployment.ref ?? "?",
            creator: deployment.creator?.login ?? "unknown",
            state: latestStatus?.state ?? "pending",
            description: latestStatus?.description ?? null,
            createdAt: deployment.created_at ?? null,
            updatedAt:
              latestStatus?.updated_at ?? deployment.updated_at ?? null,
            originalEnvironment: deployment.original_environment ?? null,
          });
        }
      } catch (error) {
        console.error(
          `Failed to fetch deployments for repository ${repositoryFullName}:`,
          error,
        );
      }
    }
    return deployments.sort((a, b) => {
      const left = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const right = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return right - left;
    });
  }

  async createDeploymentStatus(
    workspaceId: string,
    repositoryFullName: string,
    deploymentId: number,
    state: string,
    description?: string,
    environmentUrl?: string,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/deployments/${deploymentId}/statuses`,
      {
        method: "POST",
        body: JSON.stringify({
          state,
          description: description?.trim() || undefined,
          environment_url: environmentUrl?.trim() || undefined,
        }),
      },
    );
  }

  async listDependabotAlerts(
    workspaceId: string,
    projectKey?: string,
  ): Promise<GithubDependabotAlertSummary[]> {
    const repositories = await this.resolveRepositories(
      workspaceId,
      projectKey,
    );
    const alerts: GithubDependabotAlertSummary[] = [];
    for (const repositoryFullName of repositories) {
      try {
        const list = await this.requestRepository<any[]>(
          workspaceId,
          repositoryFullName,
          `/repos/${repositoryFullName}/dependabot/alerts?state=open&per_page=25`,
        );
        for (const alert of list) {
          alerts.push({
            number: alert.number,
            repositoryFullName,
            state: alert.state ?? "open",
            severity:
              alert.security_advisory?.severity ??
              alert.security_vulnerability?.severity ??
              "unknown",
            packageName: alert.dependency?.package?.name ?? "unknown",
            ecosystem: alert.dependency?.package?.ecosystem ?? "unknown",
            summary: alert.security_advisory?.summary ?? "Dependabot alert",
            html_url: alert.html_url,
            createdAt: alert.created_at ?? null,
          });
        }
      } catch (error) {
        console.error(
          `Failed to fetch Dependabot alerts for repository ${repositoryFullName}:`,
          error,
        );
      }
    }
    return alerts.sort((a, b) => {
      const left = a.createdAt ? Date.parse(a.createdAt) : 0;
      const right = b.createdAt ? Date.parse(b.createdAt) : 0;
      return right - left;
    });
  }

  async updateDependabotAlert(
    workspaceId: string,
    repositoryFullName: string,
    alertNumber: number,
    state: GithubAlertState,
    dismissedReason?: string,
    dismissedComment?: string,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/dependabot/alerts/${alertNumber}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          state,
          dismissed_reason: state === "dismissed" ? dismissedReason : undefined,
          dismissed_comment:
            state === "dismissed"
              ? dismissedComment?.trim() || undefined
              : undefined,
        }),
      },
    );
  }

  async listCodeScanningAlerts(
    workspaceId: string,
    projectKey?: string,
  ): Promise<GithubCodeScanningAlertSummary[]> {
    const repositories = await this.resolveRepositories(
      workspaceId,
      projectKey,
    );
    const alerts: GithubCodeScanningAlertSummary[] = [];
    for (const repositoryFullName of repositories) {
      try {
        const list = await this.requestRepository<any[]>(
          workspaceId,
          repositoryFullName,
          `/repos/${repositoryFullName}/code-scanning/alerts?state=open&per_page=25`,
        );
        for (const alert of list) {
          alerts.push({
            number: alert.number,
            repositoryFullName,
            state: alert.state ?? "open",
            severity:
              alert.rule?.security_severity_level ??
              alert.rule?.severity ??
              "unknown",
            rule: alert.rule?.id ?? alert.rule?.name ?? "unknown",
            tool: alert.tool?.name ?? "unknown",
            html_url: alert.html_url,
            createdAt: alert.created_at ?? null,
          });
        }
      } catch (error) {
        console.error(
          `Failed to fetch code scanning alerts for repository ${repositoryFullName}:`,
          error,
        );
      }
    }
    return alerts.sort((a, b) => {
      const left = a.createdAt ? Date.parse(a.createdAt) : 0;
      const right = b.createdAt ? Date.parse(b.createdAt) : 0;
      return right - left;
    });
  }

  async updateCodeScanningAlert(
    workspaceId: string,
    repositoryFullName: string,
    alertNumber: number,
    state: GithubAlertState,
    dismissedReason?: string,
    dismissedComment?: string,
  ): Promise<void> {
    await this.requestRepository<void>(
      workspaceId,
      repositoryFullName,
      `/repos/${repositoryFullName}/code-scanning/alerts/${alertNumber}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          state,
          dismissed_reason: state === "dismissed" ? dismissedReason : undefined,
          dismissed_comment:
            state === "dismissed"
              ? dismissedComment?.trim() || undefined
              : undefined,
        }),
      },
    );
  }

  async listDetailedPullRequests(
    workspaceId: string,
    projectKey: string,
    bypassCache = false,
  ): Promise<any[]> {
    const project = await this.projects.getByKey(workspaceId, projectKey);
    if (!project?.repositoryFullName) {
      return [];
    }
    const repositoryFullName = project.repositoryFullName;

    if (!bypassCache) {
      const cachedPrs = await this.projectPrs
        .find({ repositoryFullName })
        .sort({ number: -1 })
        .limit(15)
        .exec();
      if (cachedPrs.length > 0) {
        return cachedPrs.map((pr) => ({
          number: pr.number,
          title: pr.title,
          url: pr.url,
          state: pr.state,
          draft: pr.draft,
          headBranch: pr.headBranch,
          baseBranch: pr.baseBranch,
          headSha: pr.headSha,
          authorLogin: pr.authorLogin,
          authorAvatarUrl: pr.authorAvatarUrl,
          commitsCount: pr.commitsCount,
          changedFilesCount: pr.changedFilesCount,
          createdAt: pr.createdAt.toISOString(),
          updatedAt: pr.updatedAt.toISOString(),
          closedAt: pr.closedAt ? pr.closedAt.toISOString() : null,
          mergedAt: pr.mergedAt ? pr.mergedAt.toISOString() : null,
          checkState: pr.checkState,
        }));
      }
    }

    const rateLimitKey = `ratelimit:${repositoryFullName}`;
    if (!bypassCache) {
      const rateLimitActive = this.prsCache.get(rateLimitKey);
      if (rateLimitActive && Date.now() < rateLimitActive.expiresAt) {
        return [];
      }
    }

    try {
      const pulls = await this.requestRepository<any[]>(
        workspaceId,
        repositoryFullName,
        `/repos/${repositoryFullName}/pulls?state=all&per_page=15`,
      );
      if (!Array.isArray(pulls)) return [];

      const detailedPulls = await Promise.all(
        pulls.map(async (pr) => {
          try {
            const detail = await this.requestRepository<any>(
              workspaceId,
              repositoryFullName,
              `/repos/${repositoryFullName}/pulls/${pr.number}`,
            ).catch(() => ({}));

            const checkRunsResponse = await this.requestRepository<{
              check_runs: any[];
            }>(
              workspaceId,
              repositoryFullName,
              `/repos/${repositoryFullName}/commits/${pr.head?.sha}/check-runs`,
            ).catch(() => ({ check_runs: [] }));

            let checkState: "success" | "failure" | "pending" | null = null;
            const runs = checkRunsResponse.check_runs || [];
            if (runs.length > 0) {
              if (
                runs.some(
                  (r) => r.status === "in_progress" || r.status === "queued",
                )
              ) {
                checkState = "pending";
              } else if (
                runs.some(
                  (r) =>
                    r.conclusion === "failure" ||
                    r.conclusion === "timed_out" ||
                    r.conclusion === "action_required" ||
                    r.conclusion === "cancelled",
                )
              ) {
                checkState = "failure";
              } else if (
                runs.every(
                  (r) =>
                    r.conclusion === "success" ||
                    r.conclusion === "neutral" ||
                    r.conclusion === "skipped",
                )
              ) {
                checkState = "success";
              }
            }

            const mappedPr = {
              number: pr.number,
              title: pr.title,
              url: pr.html_url,
              state: pr.merged_at ? "merged" : pr.state,
              draft: Boolean(pr.draft),
              headBranch: pr.head?.ref ?? "",
              baseBranch: pr.base?.ref ?? "",
              headSha: pr.head?.sha ?? "",
              authorLogin: pr.user?.login ?? null,
              authorAvatarUrl: pr.user?.avatar_url ?? null,
              commitsCount: detail.commits ?? 0,
              changedFilesCount: detail.changed_files ?? 0,
              createdAt: pr.created_at,
              updatedAt: pr.updated_at,
              closedAt: pr.closed_at,
              mergedAt: pr.merged_at,
              checkState,
            };

            // Save/upsert to DB
            await this.projectPrs.updateOne(
              { repositoryFullName, number: pr.number },
              {
                $set: {
                  repositoryFullName,
                  number: pr.number,
                  title: mappedPr.title,
                  url: mappedPr.url,
                  state: mappedPr.state,
                  draft: mappedPr.draft,
                  headBranch: mappedPr.headBranch,
                  baseBranch: mappedPr.baseBranch,
                  headSha: mappedPr.headSha,
                  authorLogin: mappedPr.authorLogin,
                  authorAvatarUrl: mappedPr.authorAvatarUrl,
                  commitsCount: mappedPr.commitsCount,
                  changedFilesCount: mappedPr.changedFilesCount,
                  createdAt: new Date(mappedPr.createdAt),
                  updatedAt: new Date(mappedPr.updatedAt),
                  closedAt: mappedPr.closedAt
                    ? new Date(mappedPr.closedAt)
                    : null,
                  mergedAt: mappedPr.mergedAt
                    ? new Date(mappedPr.mergedAt)
                    : null,
                  checkState: mappedPr.checkState,
                },
              },
              { upsert: true },
            );

            return mappedPr;
          } catch (err) {
            console.error(`Failed to fetch details for PR #${pr.number}:`, err);
            const fallbackPr = {
              number: pr.number,
              title: pr.title,
              url: pr.html_url,
              state: pr.state,
              draft: Boolean(pr.draft),
              headBranch: pr.head?.ref ?? "",
              baseBranch: pr.base?.ref ?? "",
              headSha: pr.head?.sha ?? "",
              authorLogin: pr.user?.login ?? null,
              authorAvatarUrl: pr.user?.avatar_url ?? null,
              commitsCount: 0,
              changedFilesCount: 0,
              createdAt: pr.created_at,
              checkState: null,
            };

            await this.projectPrs.updateOne(
              { repositoryFullName, number: pr.number },
              {
                $set: {
                  repositoryFullName,
                  number: pr.number,
                  title: fallbackPr.title,
                  url: fallbackPr.url,
                  state: fallbackPr.state,
                  draft: fallbackPr.draft,
                  headBranch: fallbackPr.headBranch,
                  baseBranch: fallbackPr.baseBranch,
                  headSha: fallbackPr.headSha,
                  authorLogin: fallbackPr.authorLogin,
                  authorAvatarUrl: fallbackPr.authorAvatarUrl,
                  commitsCount: 0,
                  changedFilesCount: 0,
                  createdAt: new Date(fallbackPr.createdAt),
                  updatedAt: new Date(),
                  checkState: null,
                },
              },
              { upsert: true },
            );

            return fallbackPr;
          }
        }),
      );

      return detailedPulls;
    } catch (error) {
      console.error(
        `Failed to list detailed PRs for project ${projectKey}:`,
        error,
      );
      this.prsCache.set(rateLimitKey, {
        data: [],
        expiresAt: Date.now() + 60 * 1000,
      });
      return [];
    }
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
