import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  GITHUB_LINK_SOURCES,
  GITHUB_PULL_REQUEST_ACTIONS,
} from "@tasks-dash/contracts";
import { ProjectsService } from "../projects/projects.service";
import { WorkItemsService } from "../work-items/work-items.service";
import { GithubAppService } from "./github-app.service";
import { GithubWebhookService } from "./github-webhook.service";

interface TestableGithubWebhookService {
  processPullRequest(
    deliveryId: string,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  processPush(body: Record<string, unknown>): Promise<Record<string, unknown>>;
}

function createService(options: {
  configuredProjects: Array<{ key: string; repositoryFullName: string }>;
  upsertGithubPullRequest?: jest.Mock;
  linkGithubCommits?: jest.Mock;
}): TestableGithubWebhookService {
  const github = {
    findByInstallationId: jest
      .fn()
      .mockResolvedValue({ workspaceId: "workspace-1" }),
  } as unknown as GithubAppService;
  const projects = {
    list: jest.fn().mockResolvedValue(options.configuredProjects),
  } as unknown as ProjectsService;
  const workItems = {
    upsertGithubPullRequest:
      options.upsertGithubPullRequest ?? jest.fn().mockResolvedValue({}),
    linkGithubCommits:
      options.linkGithubCommits ?? jest.fn().mockResolvedValue({}),
    transitionBySystemRule: jest.fn().mockResolvedValue({}),
  } as unknown as WorkItemsService;
  const events = {
    emitAsync: jest.fn().mockResolvedValue([]),
  } as unknown as EventEmitter2;

  const discord = {
    getProjectIntegration: jest.fn().mockResolvedValue(null),
    sendToChannel: jest.fn().mockResolvedValue("msg-id"),
    sendThreadReply: jest.fn().mockResolvedValue("msg-id"),
  } as unknown as import("./discord.adapter").DiscordAdapter;
  const prLogs = {
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({}),
  } as unknown as import("mongoose").Model<import("./integration.schemas").GithubPullRequestLogHydratedDocument>;
  const members = {
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
  } as unknown as import("mongoose").Model<import("../members/member.schema").MemberHydratedDocument>;

  const workItemsModel = {
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
  } as unknown as import("mongoose").Model<import("../work-items/work-item.schema").WorkItemHydratedDocument>;

  const commentLogs = {
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    create: jest.fn().mockResolvedValue({}),
  } as unknown as import("mongoose").Model<any>;

  return new GithubWebhookService(
    {} as ConfigService,
    github,
    projects,
    workItems,
    events,
    discord,
    {} as never,
    prLogs,
    members,
    workItemsModel,
    {} as never,
    commentLogs,
    {} as never,
  ) as unknown as TestableGithubWebhookService;
}

describe("GithubWebhookService configured project key matching", () => {
  it("links only the key configured on the repository project", async () => {
    const upsertGithubPullRequest = jest.fn().mockResolvedValue({});
    const service = createService({
      configuredProjects: [
        { key: "ALPHA", repositoryFullName: "acme/application" },
      ],
      upsertGithubPullRequest,
    });

    const result = await service.processPullRequest("delivery-1", {
      action: GITHUB_PULL_REQUEST_ACTIONS.opened,
      installation: { id: 100 },
      repository: { full_name: "acme/application" },
      pull_request: {
        number: 12,
        title: "LCSP-1 must not link; ALPHA-2 is the configured task",
        body: "References abc-7 and ALPHA-2",
        html_url: "https://github.com/acme/application/pull/12",
        state: "open",
        draft: false,
        head: { ref: "feature/LCSP-3-wrong-project", sha: "head-sha" },
        base: { ref: "main" },
      },
    });

    expect(upsertGithubPullRequest).toHaveBeenCalledTimes(1);
    expect(upsertGithubPullRequest).toHaveBeenCalledWith(
      "workspace-1",
      "ALPHA-2",
      expect.objectContaining({
        number: 12,
        sources: expect.arrayContaining([
          GITHUB_LINK_SOURCES.pullRequestTitle,
          GITHUB_LINK_SOURCES.pullRequestBody,
        ]),
      }),
    );
    expect(result.workItemKeys).toEqual(["ALPHA-2"]);
  });

  it("uses the configured project key for branch and commit matching", async () => {
    const linkGithubCommits = jest.fn().mockResolvedValue({});
    const service = createService({
      configuredProjects: [
        { key: "FARM", repositoryFullName: "acme/farm-platform" },
      ],
      linkGithubCommits,
    });

    const result = await service.processPush({
      installation: { id: 101 },
      repository: { full_name: "acme/farm-platform" },
      ref: "refs/heads/feature/FARM-9-crop-health",
      commits: [
        {
          id: "commit-a",
          message: "LCSP-1 unrelated project key",
          url: "https://github.com/acme/farm-platform/commit/commit-a",
          timestamp: "2026-08-05T00:00:00Z",
        },
        {
          id: "commit-b",
          message: "farm-10 validate disease report",
          url: "https://github.com/acme/farm-platform/commit/commit-b",
          timestamp: "2026-08-05T00:01:00Z",
        },
      ],
    });

    expect(linkGithubCommits).toHaveBeenCalledWith(
      "workspace-1",
      "FARM-9",
      "feature/FARM-9-crop-health",
      expect.arrayContaining([
        expect.objectContaining({ sha: "commit-a" }),
        expect.objectContaining({ sha: "commit-b" }),
      ]),
    );
    expect(linkGithubCommits).toHaveBeenCalledWith(
      "workspace-1",
      "FARM-10",
      "feature/FARM-9-crop-health",
      [expect.objectContaining({ sha: "commit-b" })],
    );
    expect(result.workItemKeys).toEqual(expect.arrayContaining(["FARM-9", "FARM-10"]));
    expect(result.workItemKeys).not.toContain("LCSP-1");
  });

  it("does not link anything when the repository is not mapped to a project", async () => {
    const upsertGithubPullRequest = jest.fn().mockResolvedValue({});
    const service = createService({
      configuredProjects: [
        { key: "OPS", repositoryFullName: "acme/operations" },
      ],
      upsertGithubPullRequest,
    });

    const result = await service.processPullRequest("delivery-2", {
      action: GITHUB_PULL_REQUEST_ACTIONS.opened,
      installation: { id: 102 },
      repository: { full_name: "acme/unmapped" },
      pull_request: {
        number: 4,
        title: "OPS-1 should remain unlinked",
        html_url: "https://github.com/acme/unmapped/pull/4",
        state: "open",
        head: { ref: "feature/OPS-1", sha: "sha" },
        base: { ref: "main" },
      },
    });

    expect(upsertGithubPullRequest).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      linked: false,
      reason: "PROJECT_NOT_MAPPED",
    });
  });
});
