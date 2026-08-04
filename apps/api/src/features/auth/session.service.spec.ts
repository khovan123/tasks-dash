import { ConfigService } from "@nestjs/config";
import { SessionService } from "./session.service";

function service(): SessionService {
  return new SessionService({
    getOrThrow: jest.fn(() => "a-production-length-session-secret-value"),
    get: jest.fn(() => undefined),
  } as unknown as ConfigService);
}

const identity = {
  identityId: "identity-1",
  githubId: 123,
  login: "octocat",
  name: "Octo Cat",
  email: "octocat@example.com",
  avatarUrl: "https://avatars.example.com/octocat",
};

describe("SessionService multi-workspace session", () => {
  it("keeps one GitHub identity while switching member and workspace context", () => {
    const sessions = service();
    const workspaceA = sessions.verify(
      sessions.sign({
        ...identity,
        memberId: "member-a",
        userId: "member-a",
        workspaceId: "workspace-a",
      }),
    );
    const workspaceB = sessions.verify(
      sessions.sign({
        ...identity,
        memberId: "member-b",
        userId: "member-b",
        workspaceId: "workspace-b",
      }),
    );

    expect(workspaceA.identityId).toBe(workspaceB.identityId);
    expect(workspaceA.workspaceId).toBe("workspace-a");
    expect(workspaceB.workspaceId).toBe("workspace-b");
    expect(workspaceA.memberId).toBe("member-a");
    expect(workspaceB.memberId).toBe("member-b");
  });

  it("rejects the previous single-workspace session shape", () => {
    const sessions = service();
    const legacy = sessions.sign({
      ...identity,
      identityId: "",
      memberId: "member-a",
      userId: "member-a",
      workspaceId: "workspace-a",
    });
    expect(() => sessions.verify(legacy)).toThrow("Session upgrade is required");
  });
});
