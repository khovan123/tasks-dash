import { ConfigService } from "@nestjs/config";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { ProjectsService } from "../projects/projects.service";
import { GithubUserTokenService } from "../auth/github-user-token.service";
import {
  GithubAppService,
  GithubRepositoryResponse,
} from "./github-app.service";

function createService() {
  const projects = {
    list: jest.fn().mockResolvedValue([]),
    getByKey: jest.fn(),
    linkRepository: jest.fn().mockResolvedValue({ key: "ALPHA" }),
    unlinkRepository: jest.fn().mockResolvedValue({ key: "ALPHA" }),
  } as unknown as ProjectsService;
  const projectPrs = {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    }),
    updateOne: jest.fn().mockResolvedValue({}),
  };
  const service = new GithubAppService(
    {} as ConfigService,
    {} as never,
    projectPrs as any,
    projects,
    {} as GithubUserTokenService,
  );
  return {
    service,
    projects: projects as unknown as {
      getByKey: jest.Mock;
      linkRepository: jest.Mock;
      unlinkRepository: jest.Mock;
    },
  };
}

const repository: GithubRepositoryResponse = {
  id: 987,
  name: "renamed-app",
  full_name: "acme/renamed-app",
  private: true,
  default_branch: "main",
  html_url: "https://github.com/acme/renamed-app",
  owner: { login: "acme" },
};

describe("GithubAppService project repository linking", () => {
  it("stores the canonical full_name returned by GitHub for a selected id", async () => {
    const { service, projects } = createService();
    jest.spyOn(service, "repositories").mockResolvedValue([repository]);

    const result = await service.linkProjectRepository(
      "workspace-1",
      "alpha",
      repository.id,
    );

    expect(projects.linkRepository).toHaveBeenCalledWith(
      "workspace-1",
      "alpha",
      "acme/renamed-app",
    );
    expect(result).toEqual({
      projectKey: "ALPHA",
      repository: {
        id: 987,
        name: "renamed-app",
        fullName: "acme/renamed-app",
        htmlUrl: "https://github.com/acme/renamed-app",
        private: true,
        defaultBranch: "main",
      },
    });
  });

  it("rejects a repository id that is not available to the installation", async () => {
    const { service, projects } = createService();
    jest.spyOn(service, "repositories").mockResolvedValue([]);

    await expect(
      service.linkProjectRepository("workspace-1", "ALPHA", 123),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(projects.linkRepository).not.toHaveBeenCalled();
  });

  it("rejects a repository already linked to another project", async () => {
    const { service, projects } = createService();
    jest.spyOn(service, "repositories").mockResolvedValue([
      { ...repository, linkedProjectKey: "BETA" },
    ]);

    await expect(
      service.linkProjectRepository("workspace-1", "ALPHA", repository.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(projects.linkRepository).not.toHaveBeenCalled();
  });
});

describe("GithubAppService GitHub command helpers", () => {
  it("filters pull requests out of issue listings", async () => {
    const { service } = createService();
    jest
      .spyOn(service as any, "resolveRepositories")
      .mockResolvedValue(["acme/renamed-app"]);
    jest.spyOn(service as any, "requestRepository").mockResolvedValue([
      {
        number: 12,
        title: "Real issue",
        html_url: "https://github.com/acme/renamed-app/issues/12",
        state: "open",
        user: { login: "octocat" },
      },
      {
        number: 13,
        title: "Actually a PR",
        html_url: "https://github.com/acme/renamed-app/pull/13",
        state: "open",
        user: { login: "octocat" },
        pull_request: {},
      },
    ]);

    await expect(service.listOpenIssues("workspace-1")).resolves.toEqual([
      {
        number: 12,
        title: "Real issue",
        html_url: "https://github.com/acme/renamed-app/issues/12",
        repositoryFullName: "acme/renamed-app",
        author: "octocat",
        state: "open",
      },
    ]);
  });

  it("sorts workflow runs newest first across repositories", async () => {
    const { service } = createService();
    jest
      .spyOn(service as any, "resolveRepositories")
      .mockResolvedValue(["acme/renamed-app", "acme/platform"]);
    const requestRepository = jest.spyOn(service as any, "requestRepository");
    requestRepository
      .mockResolvedValueOnce({
        workflow_runs: [
          {
            id: 101,
            name: "CI",
            display_title: "Build and test",
            html_url: "https://github.com/acme/renamed-app/actions/runs/101",
            status: "completed",
            conclusion: "success",
            head_branch: "main",
            event: "push",
            created_at: "2026-08-05T00:00:00Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        workflow_runs: [
          {
            id: 202,
            name: "Deploy",
            display_title: "Deploy production",
            html_url: "https://github.com/acme/platform/actions/runs/202",
            status: "in_progress",
            conclusion: null,
            head_branch: "release",
            event: "workflow_dispatch",
            created_at: "2026-08-06T00:00:00Z",
          },
        ],
      });

    const runs = await service.listWorkflowRuns("workspace-1");

    expect(runs.map((run) => run.id)).toEqual([202, 101]);
    expect(runs[0]).toMatchObject({
      repositoryFullName: "acme/platform",
      workflowName: "Deploy",
      name: "Deploy production",
    });
  });

  it("lists check suites from repository default branches", async () => {
    const { service } = createService();
    jest
      .spyOn(service as any, "resolveRepositories")
      .mockResolvedValue(["acme/renamed-app"]);
    jest.spyOn(service, "repositories").mockResolvedValue([
      repository,
    ]);
    jest.spyOn(service as any, "requestRepository").mockResolvedValue({
      check_suites: [
        {
          id: 31,
          head_branch: "main",
          head_sha: "abcdef123456",
          status: "completed",
          conclusion: "success",
          app: { name: "CI" },
          created_at: "2026-08-05T00:00:00Z",
          updated_at: "2026-08-06T00:00:00Z",
        },
      ],
    });

    await expect(service.listCheckSuites("workspace-1")).resolves.toEqual([
      {
        id: 31,
        repositoryFullName: "acme/renamed-app",
        branch: "main",
        headSha: "abcdef123456",
        status: "completed",
        conclusion: "success",
        appName: "CI",
        createdAt: "2026-08-05T00:00:00Z",
        updatedAt: "2026-08-06T00:00:00Z",
      },
    ]);
  });
});
