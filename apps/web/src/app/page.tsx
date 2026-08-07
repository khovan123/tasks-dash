import Link from "next/link";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  Activity,
  CheckCircle2,
  FolderKanban,
  Github,
  GitPullRequest,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiData, apiResponse } from "@/lib/server/api-data";
import { MemberAvatar } from "@/components/member-avatar";
import { MemberInfoBadge } from "@/components/member-info-badge";
import { NewProjectModal } from "@/components/new-project-modal";
import { ProjectLogo } from "@/components/project-logo";
import { UnauthenticatedHome } from "@/components/unauthenticated-home";
import { AppPage, SectionHeading } from "@/components/layout/app-shell";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { ActivityChart } from "@/components/activity-chart";

export const dynamic = "force-dynamic";

interface Session {
  login: string;
  name: string;
}
interface Member {
  _id?: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  status: string;
  githubLogin?: string;
  discordUsername?: string;
}
interface Project {
  key: string;
  name: string;
  description: string;
  color?: string;
  repositoryFullName?: string;
  progress: number;
  totalItems: number;
  completedItems: number;
  openPrItems: number;
}
interface DailyActivity {
  _id: { projectKey: string; day: string };
  created: number;
  completed: number;
}
interface Dashboard {
  projects: Project[];
  members: Member[];
  dailyActivity: DailyActivity[];
}

function aggregateActivity(activity: DailyActivity[]) {
  const grouped = new Map<
    string,
    { day: string; created: number; completed: number }
  >();
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

export default async function HomePage() {
  const sessionResponse = await apiResponse("/auth/me");
  const browserApi =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.TASKS_DASH_API_BASE_URL ||
    "/api";

  if (sessionResponse.status === 401) {
    const loginUrl = `${browserApi.replace(/\/$/, "")}/auth/github/login`;
    return (
      <UnauthenticatedHome
        loginUrl={loginUrl}
        deviceLoginHref="/login/code"
      />
    );
  }

  const sessionPayload = (await sessionResponse.json()) as {
    ok: true;
    data: Session;
  };
  const session = sessionPayload.data;
  const [dashboard, workspaces] = await Promise.all([
    apiData<Dashboard>("/dashboard/overview"),
    apiData<WorkspaceOption[]>("/workspaces").catch(() => []),
  ]);
  const canCreateProject =
    workspaces.find((workspace) => workspace.active)?.role ===
    MEMBER_ROLES.owner;
  const totalItems = dashboard.projects.reduce(
    (sum, project) => sum + project.totalItems,
    0,
  );
  const completedItems = dashboard.projects.reduce(
    (sum, project) => sum + project.completedItems,
    0,
  );
  const completionRate = totalItems
    ? Math.round((completedItems / totalItems) * 100)
    : 0;
  const openPullRequests = dashboard.projects.reduce(
    (sum, project) => sum + project.openPrItems,
    0,
  );
  const onlineMembers = dashboard.members.filter(
    (member) => member.status.toUpperCase() === "ONLINE",
  ).length;
  const activity = aggregateActivity(dashboard.dailyActivity);

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Overview
          </h1>
          <p className="mt-2 text-muted-foreground">
            Xin chào {session.name || session.login}. Theo dõi delivery health,
            thành viên và tiến độ của tất cả dự án trong workspace.
          </p>
        </div>
        {canCreateProject ? (
          <NewProjectModal
            trigger={<Button variant="outline">Tạo dự án mới</Button>}
          />
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-4 py-5">
          <CardHeader className="grid grid-cols-[1fr_auto] items-start px-5">
            <div>
              <CardDescription>Active projects</CardDescription>
              <CardTitle className="mt-2 text-3xl">
                {dashboard.projects.length}
              </CardTitle>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <FolderKanban className="size-5" />
            </div>
          </CardHeader>
          <CardFooter className="px-5 text-xs text-muted-foreground">
            Across the active workspace
          </CardFooter>
        </Card>
        <Card className="gap-4 py-5">
          <CardHeader className="grid grid-cols-[1fr_auto] items-start px-5">
            <div>
              <CardDescription>Completed work</CardDescription>
              <CardTitle className="mt-2 text-3xl">{completionRate}%</CardTitle>
            </div>
            <div className="rounded-lg bg-secondary p-2.5 text-secondary-foreground">
              <CheckCircle2 className="size-5" />
            </div>
          </CardHeader>
          <CardFooter className="px-5 text-xs text-muted-foreground">
            {completedItems} of {totalItems} work items
          </CardFooter>
        </Card>
        <Card className="gap-4 py-5">
          <CardHeader className="grid grid-cols-[1fr_auto] items-start px-5">
            <div>
              <CardDescription>Open pull requests</CardDescription>
              <CardTitle className="mt-2 text-3xl">
                {openPullRequests}
              </CardTitle>
            </div>
            <div className="rounded-lg bg-accent p-2.5 text-accent-foreground">
              <GitPullRequest className="size-5" />
            </div>
          </CardHeader>
          <CardFooter className="px-5 text-xs text-muted-foreground">
            Linked to incomplete work
          </CardFooter>
        </Card>
        <Card className="gap-4 py-5">
          <CardHeader className="grid grid-cols-[1fr_auto] items-start px-5">
            <div>
              <CardDescription>Team members</CardDescription>
              <CardTitle className="mt-2 text-3xl">
                {dashboard.members.length}
              </CardTitle>
            </div>
            <div className="rounded-lg bg-muted p-2.5 text-foreground">
              <Users className="size-5" />
            </div>
          </CardHeader>
          <CardFooter className="px-5 text-xs text-muted-foreground">
            {onlineMembers} active now
          </CardFooter>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <SectionHeading
              eyebrow="Delivery"
              title="Project progress"
              meta={<TrendingUp className="size-5 text-primary" />}
            />
          </CardHeader>
          <CardContent>
            {dashboard.projects.length ? (
              <div className="flex flex-col gap-3">
                {dashboard.projects.map((project) => (
                  <Link
                    href={`/projects/${project.key}`}
                    key={project.key}
                    className="block rounded-xl border bg-card p-4 transition hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <ProjectLogo
                        projectKey={project.key}
                        projectName={project.name}
                        size={40}
                        className="size-10 rounded-lg shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="truncate font-semibold">
                            {project.name}
                          </h3>
                          <span className="text-sm font-bold">
                            {project.progress}%
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {project.description || "Chưa có mô tả dự án"}
                        </p>
                      </div>
                    </div>
                    <Progress value={project.progress} className="mt-3" />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {project.completedItems}/{project.totalItems} completed
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GitPullRequest className="size-3.5" />
                        {project.openPrItems} linked PRs
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty>
                <FolderKanban className="size-9 text-primary" />
                <EmptyHeader>
                  <EmptyTitle>Chưa có dự án</EmptyTitle>
                  <EmptyDescription>
                    Tạo dự án đầu tiên để bắt đầu quản lý.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {canCreateProject ? (
                    <NewProjectModal trigger={<Button>Tạo dự án</Button>} />
                  ) : null}
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Workspace people"
                title="Current members"
                meta={`${dashboard.members.length} members`}
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {dashboard.members.slice(0, 8).map((member) => (
                <div key={member.email} className="flex items-center gap-3">
                  <MemberInfoBadge
                    memberId={member._id}
                    name={member.name}
                    avatarUrl={member.avatarUrl}
                    email={member.email}
                    githubLogin={member.githubLogin}
                    discordUsername={member.discordUsername}
                    presence={member.status as any}
                    avatarClassName="size-9"
                    textClassName="text-sm font-semibold"
                  />
                </div>
              ))}
            </CardContent>
            {canCreateProject ? (
              <CardFooter>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/workspace/members">Quản lý thành viên</Link>
                </Button>
              </CardFooter>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <SectionHeading
                eyebrow="Last seven days"
                title="Daily work activity"
                meta={<Activity className="size-5 text-primary" />}
              />
            </CardHeader>
            <CardContent>
              <ActivityChart data={activity} />
            </CardContent>
          </Card>
        </div>
      </section>
    </AppPage>
  );
}
