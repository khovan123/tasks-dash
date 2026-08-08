import "server-only";

import { MEMBER_ROLES } from "@tasks-dash/contracts";
import type {
  DashboardActivityPoint,
  DashboardDailyActivity,
  DashboardMetrics,
  DashboardOverviewData,
  DashboardSession,
} from "@/features/dashboard/types";
import { loadPublicAuthLinks } from "@/features/auth/server/load-public-auth-links";
import { apiData, apiResponse } from "@/lib/server/api-data";

interface WorkspaceAccessOption {
  active?: boolean;
  role?: string;
}

function aggregateActivity(activity: DashboardDailyActivity[]): DashboardActivityPoint[] {
  const grouped = new Map<string, DashboardActivityPoint>();
  for (const item of activity) {
    const current = grouped.get(item._id.day) ?? {
      day: item._id.day,
      created: 0,
      completed: 0,
    };
    current.created += item.created;
    current.completed += item.completed;
    grouped.set(item._id.day, current);
  }

  return [...grouped.values()]
    .sort((left, right) => left.day.localeCompare(right.day))
    .slice(-7);
}

function buildMetrics(dashboard: DashboardOverviewData): DashboardMetrics {
  const totalItems = dashboard.projects.reduce(
    (sum, project) => sum + project.totalItems,
    0,
  );
  const completedItems = dashboard.projects.reduce(
    (sum, project) => sum + project.completedItems,
    0,
  );

  return {
    projectCount: dashboard.projects.length,
    completionRate: totalItems
      ? Math.round((completedItems / totalItems) * 100)
      : 0,
    completedItems,
    totalItems,
    openPullRequests: dashboard.projects.reduce(
      (sum, project) => sum + project.openPrItems,
      0,
    ),
    memberCount: dashboard.members.length,
    onlineMembers: dashboard.members.filter(
      (member) => member.status.toUpperCase() === "ONLINE",
    ).length,
  };
}

export async function loadDashboardPage() {
  const sessionResponse = await apiResponse("/auth/me");

  if (sessionResponse.status === 401) {
    return {
      authenticated: false as const,
      ...loadPublicAuthLinks(),
    };
  }

  if (!sessionResponse.ok) {
    throw new Error(`Session request failed with HTTP ${sessionResponse.status}.`);
  }

  const sessionPayload = (await sessionResponse.json()) as {
    ok: true;
    data: DashboardSession;
  };
  const [dashboard, workspaces] = await Promise.all([
    apiData<DashboardOverviewData>("/dashboard/overview"),
    apiData<WorkspaceAccessOption[]>("/workspaces").catch(() => []),
  ]);

  return {
    authenticated: true as const,
    session: sessionPayload.data,
    dashboard,
    canCreateProject:
      workspaces.find((workspace) => workspace.active)?.role === MEMBER_ROLES.owner,
    metrics: buildMetrics(dashboard),
    activity: aggregateActivity(dashboard.dailyActivity),
  };
}
