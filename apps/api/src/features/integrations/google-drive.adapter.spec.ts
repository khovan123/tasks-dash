import { ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import { ProjectsService } from "../projects/projects.service";
import { DriveOauthStateService } from "./drive-oauth-state.service";
import { GoogleDriveAdapter } from "./google-drive.adapter";

interface DriveInternals {
  getFile(token: string, id: string): Promise<Record<string, unknown>>;
  assertInsideProject(
    token: string,
    rootId: string,
    fileId: string,
    allowRoot: boolean,
  ): Promise<unknown>;
}

function createAdapter() {
  const config = {
    getOrThrow: jest.fn((key: string) => {
      if (key === "GOOGLE_DRIVE_CLIENT_ID") return "client-id";
      if (key === "GOOGLE_DRIVE_REDIRECT_URI") {
        return "https://api.example.com/api/integrations/google-drive/callback";
      }
      return "secret";
    }),
  } as unknown as ConfigService;
  const states = {
    create: jest.fn().mockResolvedValue("oauth-state"),
  } as unknown as DriveOauthStateService;
  const adapter = new GoogleDriveAdapter(
    config,
    {} as CredentialEncryptionService,
    {} as ProjectsService,
    {} as never,
    {} as never,
    states,
  );
  return {
    adapter,
    states: states as unknown as { create: jest.Mock },
  };
}

describe("GoogleDriveAdapter managed workspace boundary", () => {
  it("requests drive.file and binds OAuth state to the workspace Owner", async () => {
    const { adapter, states } = createAdapter();
    const url = new URL(await adapter.connectUrl("workspace-1", "owner-1"));

    expect(states.create).toHaveBeenCalledWith("workspace-1", "owner-1");
    expect(url.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/drive.file",
    );
    expect(url.searchParams.get("scope")).not.toContain("drive.readonly");
  });

  it("rejects an item whose parent chain does not reach the project root", async () => {
    const { adapter } = createAdapter();
    const internal = adapter as unknown as DriveInternals;
    jest.spyOn(internal, "getFile").mockImplementation(async (_token, id) => {
      const files: Record<string, Record<string, unknown>> = {
        external: {
          id: "external",
          name: "External",
          mimeType: "application/vnd.google-apps.folder",
          parents: ["another-root"],
        },
        "another-root": {
          id: "another-root",
          name: "Another root",
          mimeType: "application/vnd.google-apps.folder",
          parents: [],
        },
      };
      return files[id];
    });

    await expect(
      internal.assertInsideProject(
        "token",
        "project-root",
        "external",
        true,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("does not allow the system-managed project root to be renamed or deleted", async () => {
    const { adapter } = createAdapter();
    const internal = adapter as unknown as DriveInternals;
    await expect(
      internal.assertInsideProject(
        "token",
        "project-root",
        "project-root",
        false,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
