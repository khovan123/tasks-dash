import {
  CheckCircle2,
  FolderKanban,
  GitPullRequest,
  Users,
} from "lucide-react";
import { DashboardKpiCard } from "@/components/molecules/dashboard-kpi-card";
import type { DashboardMetrics } from "@/features/dashboard/types";

export function DashboardKpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardKpiCard
        label="Active projects"
        value={metrics.projectCount}
        helper="Across the active workspace"
        icon={<FolderKanban className="size-5" />}
        iconClassName="bg-primary/10 text-primary"
      />
      <DashboardKpiCard
        label="Completed work"
        value={`${metrics.completionRate}%`}
        helper={`${metrics.completedItems} of ${metrics.totalItems} work items`}
        icon={<CheckCircle2 className="size-5" />}
        iconClassName="bg-secondary text-secondary-foreground"
      />
      <DashboardKpiCard
        label="Open pull requests"
        value={metrics.openPullRequests}
        helper="Linked to incomplete work"
        icon={<GitPullRequest className="size-5" />}
        iconClassName="bg-accent text-accent-foreground"
      />
      <DashboardKpiCard
        label="Team members"
        value={metrics.memberCount}
        helper={`${metrics.onlineMembers} active now`}
        icon={<Users className="size-5" />}
      />
    </section>
  );
}
