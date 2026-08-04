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
    linkRepository: jest.fn().mockResolvedValue({ key: "ALPHA" }),
    unlinkRepository: jest.fn().mockResolvedValue({ key: "ALPHA" }),
  } as unknown as ProjectsService;
  const service = new GithubAppService(
    {} as ConfigService,
    {} as never,
    projects,
    {} as GithubUserTokenService,
  );
  return {
    service,
    projects: projects as unknown as {
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
