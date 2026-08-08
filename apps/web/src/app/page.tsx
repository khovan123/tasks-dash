import { DashboardActivityCard } from "@/components/organisms/dashboard-activity-card";
import { DashboardHeader } from "@/components/organisms/dashboard-header";
import { DashboardKpiGrid } from "@/components/organisms/dashboard-kpi-grid";
import { DashboardMembersCard } from "@/components/organisms/dashboard-members-card";
import { DashboardProjectProgress } from "@/components/organisms/dashboard-project-progress";
import { AppPage } from "@/components/templates/app-page";
import { UnauthenticatedHome } from "@/components/unauthenticated-home";
import { loadDashboardPage } from "@/features/dashboard/server/load-dashboard-page";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const context = await loadDashboardPage();

  if (!context.authenticated) {
    return (
      <UnauthenticatedHome
        loginUrl={context.loginUrl}
        deviceLoginHref={context.deviceLoginHref}
      />
    );
  }

  return (
    <AppPage>
      <DashboardHeader
        session={context.session}
        canCreateProject={context.canCreateProject}
      />
      <DashboardKpiGrid metrics={context.metrics} />
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <DashboardProjectProgress
          projects={context.dashboard.projects}
          canCreateProject={context.canCreateProject}
        />
        <div className="flex flex-col gap-6">
          <DashboardMembersCard
            members={context.dashboard.members}
            canManageMembers={context.canCreateProject}
          />
          <DashboardActivityCard activity={context.activity} />
        </div>
      </section>
    </AppPage>
  );
}
