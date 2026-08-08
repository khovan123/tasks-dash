import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function source(path) {
  return readFile(new URL(path, new URL("../", import.meta.url)), "utf8");
}

test("workspace lifecycle includes named onboarding, create, rename and delete", async () => {
  const [auth, controller, dto, switcher, createForm, actions, newPage] =
    await Promise.all([
      source("../api/src/features/auth/auth.controller.ts"),
      source("../api/src/features/auth/workspaces.controller.ts"),
      source("../api/src/features/members/members.dto.ts"),
      source("src/components/organisms/workspace-switcher.tsx"),
      source("src/components/organisms/workspace-create-form.tsx"),
      source("src/components/organisms/workspace-actions.tsx"),
      source("src/app/workspaces/new/page.tsx"),
    ]);

  assert.equal(auth.includes('workspaceName: "Tasks Dash Workspace"'), false);
  assert.match(auth, /workspace_setup/);
  assert.match(auth, /\/workspaces\/new/);
  assert.match(controller, /@Post\("setup"\)/);
  assert.match(controller, /@Patch\(":workspaceId"\)/);
  assert.match(controller, /@Delete\(":workspaceId"\)/);
  assert.match(dto, /SetupFirstWorkspaceDto/);
  assert.match(dto, /UpdateWorkspaceDto/);
  assert.match(dto, /DeleteWorkspaceDto/);
  assert.match(switcher, /href="\/workspaces\/new"/);
  assert.match(switcher, /Tạo workspace mới/);
  assert.match(createForm, /Đặt tên workspace đầu tiên/);
  assert.match(createForm, /workspaceName/);
  assert.match(actions, /Đổi tên workspace/);
  assert.match(actions, /Xóa workspace/);
  assert.match(actions, /confirmWorkspaceName/);
  assert.match(newPage, /setupToken/);
});
