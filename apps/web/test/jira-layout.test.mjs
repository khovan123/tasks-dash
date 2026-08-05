import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

async function source(path) {
  return readFile(new URL(path, new URL("../", import.meta.url)), "utf8");
}

test("authenticated pages keep the Jira-style application shell", async () => {
  const [layout, shell, dashboard] = await Promise.all([
    source("src/app/layout.tsx"),
    source("src/components/layout/jira-app-shell.tsx"),
    source("src/app/page.tsx"),
  ]);

  assert.match(layout, /JiraAppShell/);
  assert.match(layout, /apiData<JiraShellProject\[]>\("\/projects"\)/);
  assert.match(shell, /fixed inset-y-0 left-0/);
  assert.match(shell, /projects\.map/);
  assert.match(shell, /\/workspace\/members/);
  assert.match(shell, /\/settings\/integrations/);
  assert.match(shell, /\/backlog/);
  assert.match(shell, /\/docs/);
  assert.match(shell, /WorkspaceSwitcher/);
  assert.match(dashboard, /Project progress/);
  assert.match(dashboard, /Current members/);
  assert.match(dashboard, /Daily work activity/);
  assert.match(dashboard, /Open pull requests/);
  assert.equal(dashboard.includes("demoData"), false);
});
