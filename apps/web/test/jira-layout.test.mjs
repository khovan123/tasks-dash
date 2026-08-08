import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function source(path) {
  return readFile(new URL(path, new URL("../", import.meta.url)), "utf8");
}

test("authenticated pages keep the Jira-style application shell", async () => {
  const [
    layout,
    shell,
    dashboardPage,
    projectProgress,
    membersCard,
    activityCard,
    kpiGrid,
  ] = await Promise.all([
    source("src/app/layout.tsx"),
    source("src/components/layout/jira-app-shell.tsx"),
    source("src/app/page.tsx"),
    source("src/components/organisms/dashboard-project-progress.tsx"),
    source("src/components/organisms/dashboard-members-card.tsx"),
    source("src/components/organisms/dashboard-activity-card.tsx"),
    source("src/components/organisms/dashboard-kpi-grid.tsx"),
  ]);

  assert.match(layout, /JiraAppShell/);
  assert.match(layout, /apiData<JiraShellProject\[]>\("\/projects"\)/);
  assert.match(shell, /fixed inset-y-0 left-0/);
  assert.match(shell, /filteredProjects\.map/);
  assert.match(shell, /\/workspace\/members/);
  assert.match(shell, /\/settings\/integrations/);
  assert.match(shell, /\/backlog/);
  assert.match(shell, /\/docs/);
  assert.match(shell, /WorkspaceSwitcher/);

  assert.match(dashboardPage, /DashboardProjectProgress/);
  assert.match(dashboardPage, /DashboardMembersCard/);
  assert.match(dashboardPage, /DashboardActivityCard/);
  assert.match(dashboardPage, /DashboardKpiGrid/);
  assert.match(projectProgress, /Project progress/);
  assert.match(membersCard, /Current members/);
  assert.match(activityCard, /Daily work activity/);
  assert.match(kpiGrid, /Open pull requests/);
  assert.equal(dashboardPage.includes("demoData"), false);
});
