import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  FolderKanban,
  GitPullRequest,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiData, apiResponse } from "@/lib/server/api-data";
import { ProjectCreateForm } from "@/components/project-create-form";
import { AppPage, SectionHeading } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export const dynamic = "force-dynamic";

interface Session {
  login: string;
  name: string;
}
interface Member {
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  status: string;
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

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function aggregateActivity(activity: DailyActivity[]) {
  const grouped = new Map<string, { day: string; created: number; completed: number }>();
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
  const browserApi = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!browserApi) throw new Error("NEXT_PUBLIC_API_BASE_URL is required.");

  if (sessionResponse.status === 401) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <Card className="w-full max-w-lg border-primary/20 shadow-xl shadow-primary/10">
          <CardHeader className="items-center text-center">
            <div className="mb-2 grid size-14 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
              TD
            </div>
            <Badge variant="purple">INVITE-ONLY MULTI-WORKSPACE</Badge>
            <CardTitle className="text-4xl">Tasks Dash</CardTitle>
            <CardDescription className="max-w-md text-base leading-relaxed">
              Một GitHub account có thể tham gia nhiều workspace, nhưng workspace
              mới vẫn cần invitation hoặc được Owner tạo từ workspace hiện tại.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild size="lg">
              <a href={`${browserApi.replace(/\/$/, "")}/auth/github/login`}>
                Đăng nhập với GitHub
              </a>
            </Button>
          </CardContent>
          <CardFooter className="justify-center text-center text-sm text-muted-foreground">
            Thành viên mới phải mở link invitation được gửi qua email.
          </CardFooter>
        </Card>
      </main>
    );
  }

  const sessionPayload = (await sessionResponse.json()) as {
    ok: true;
    data: Session;
  };
  const session = sessionPayload.data;
  const dashboard = await apiData<Dashboard>("/dashboard/overview");
  const totalItems = dashboard.projects.reduce((sum, project) => sum + project.totalItems, 0);
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
  const activityMaximum = Math.max(
    1,
    ...activity.flatMap((item) => [item.created, item.completed]),
  );

  return (
    <AppPage>
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Workspace portfolio</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Portfolio overview
          </h1>
          <p className="mt-2 text-muted-foreground">
            Xin chào {session.name || session.login}. Theo dõi delivery health,
            thành viên và tiến độ của tất cả dự án trong workspace.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="#create-project">Tạo dự án mới</Link>
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-4 py-5">
          <CardHeader className="grid grid-cols-[1fr_auto] items-start px-5">
            <div>
              <CardDescription>Active projects</CardDescription>
              <CardTitle className="mt-2 text-3xl">{dashboard.projects.length}</CardTitle>
            </div>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <FolderKanban className="size-5" />
            </div>
          </CardHeader>
          <CardFooter className="px-5 text-xs text-muted-foreground">Across the active workspace</CardFooter>
        </Card>
        <Card className="gap-4 py-5">
          <CardHeader className="grid grid-cols-[1fr_auto] items-start px-5">
            <div>
              <CardDescription>Completed work</CardDescription>
              <CardTitle className="mt-2 text-3xl">{completionRate}%</CardTitle>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </div>
          </CardHeader>
          <CardFooter className="px-5 text-xs text-muted-foreground">{completedItems} of {totalItems} work items</CardFooter>
        </Card>
        <Card className="gap-4 py-5">
          <CardHeader className="grid grid-cols-[1fr_auto] items-start px-5">
            <div>
              <CardDescription>Open pull requests</CardDescription>
              <CardTitle className="mt-2 text-3xl">{openPullRequests}</CardTitle>
            </div>
            <div className="rounded-lg bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
              <GitPullRequest className="size-5" />
            </div>
          </CardHeader>
          <CardFooter className="px-5 text-xs text-muted-foreground">Linked to incomplete work</CardFooter>
        </Card>
        <Card className="gap-4 py-5">
          <CardHeader className="grid grid-cols-[1fr_auto] items-start px-5">
            <div>
              <CardDescription>Team members</CardDescription>
              <CardTitle className="mt-2 text-3xl">{dashboard.members.length}</CardTitle>
            </div>
            <div className="rounded-lg bg-sky-50 p-2.5 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
              <Users className="size-5" />
            </div>
          </CardHeader>
          <CardFooter className="px-5 text-xs text-muted-foreground">{onlineMembers} currently online</CardFooter>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <SectionHeading
              eyebrow="Delivery portfolio"
              title="Project progress"
              meta={<TrendingUp className="size-5 text-primary" />}
            />
          </CardHeader>
          <CardContent>
            {dashboard.projects.length ? (
              <div className="space-y-3">
                {dashboard.projects.map((project) => (
                  <Link
                    href={`/projects/${project.key}`}
                    key={project.key}
                    className="block rounded-xl border bg-card p-4 transition hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-lg text-xs font-black text-white shadow-sm"
                        style={{ backgroundColor: project.color ?? "#4f46e5" }}
                      >
                        {project.key.slice(0, 3)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="truncate font-semibold">{project.name}</h3>
                          <span className="text-sm font-bold">{project.progress}%</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {project.description || "Chưa có mô tả dự án"}
                        </p>
                      </div>
                    </div>
                    <Progress value={project.progress} className="mt-3" />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{project.completedItems}/{project.totalItems} completed</span>
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
                  <EmptyDescription>Tạo dự án đầu tiên ở form phía dưới.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent><Button asChild><Link href="#create-project">Tạo dự án</Link></Button></EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <SectionHeading eyebrow="Workspace people" title="Current members" meta={`${dashboard.members.length} members`} />
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.members.slice(0, 8).map((member) => (
                <div key={member.email} className="flex items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback>{initials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-[10px]">{member.role.replaceAll("_", " ")}</Badge>
                    <p className={member.status.toUpperCase() === "ONLINE" ? "mt-1 text-[10px] font-semibold text-emerald-600" : "mt-1 text-[10px] font-semibold text-amber-600"}>
                      {member.status}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button asChild variant="ghost" size="sm"><Link href="/workspace/members">Quản lý thành viên</Link></Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <SectionHeading eyebrow="Last seven days" title="Daily work activity" meta={<Activity className="size-5 text-primary" />} />
            </CardHeader>
            <CardContent>
              {activity.length ? (
                <div>
                  <div className="flex h-44 items-end gap-3">
                    {activity.map((item) => (
                      <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <div className="flex h-32 w-full items-end justify-center gap-1.5">
                          <div
                            className="w-3 rounded-t bg-indigo-500"
                            style={{ height: `${Math.max(6, (item.created / activityMaximum) * 100)}%` }}
                            title={`${item.created} created`}
                          />
                          <div
                            className="w-3 rounded-t bg-emerald-500"
                            style={{ height: `${Math.max(6, (item.completed / activityMaximum) * 100)}%` }}
                            title={`${item.completed} completed`}
                          />
                        </div>
                        <span className="max-w-full truncate text-[10px] text-muted-foreground">
                          {item.day.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-indigo-500" />Created</span>
                    <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-emerald-500" />Completed</span>
                  </div>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">Chưa có hoạt động trong bảy ngày gần nhất.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="create-project" className="scroll-mt-24">
        <ProjectCreateForm />
      </section>
    </AppPage>
  );
}
