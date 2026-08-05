import Link from "next/link";
import { FolderKanban, Settings, Users, Workflow } from "lucide-react";
import { apiData, apiResponse } from "@/lib/server/api-data";
import { ProjectCreateForm } from "@/components/project-create-form";
import { LogoutButton } from "@/components/logout-button";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import {
  AppNav,
  AppPage,
  AppTopbar,
  PageHero,
} from "@/components/layout/app-shell";
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
  identityId: string;
  memberId: string;
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  workspaceId: string;
}
interface Member {
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
}
interface Project {
  key: string;
  name: string;
  description: string;
  repositoryFullName?: string;
  progress: number;
  totalItems: number;
  completedItems: number;
  openPrItems: number;
}
interface Dashboard {
  projects: Project[];
  members: Member[];
  dailyActivity: Array<{
    _id: { projectKey: string; day: string };
    created: number;
    completed: number;
  }>;
}

export default async function HomePage() {
  const sessionResponse = await apiResponse("/auth/me");
  const browserApi =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.TASKS_DASH_API_BASE_URL ||
    "http://localhost:4000/api";

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
  const [dashboard, workspaces] = await Promise.all([
    apiData<Dashboard>("/dashboard/overview"),
    apiData<WorkspaceOption[]>("/workspaces"),
  ]);

  return (
    <AppPage>
      <AppTopbar>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Tasks Dash
          </p>
          <p className="font-semibold">Production workspace</p>
        </div>
        <AppNav>
          <WorkspaceSwitcher workspaces={workspaces} compact />
          <Button asChild variant="ghost" size="sm">
            <Link href="/workspaces"><Workflow />Workspaces</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/workspace/members"><Users />Thành viên ({dashboard.members.length})</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings/integrations"><Settings />Tích hợp</Link>
          </Button>
          <LogoutButton />
        </AppNav>
      </AppTopbar>

      <PageHero
        eyebrow={`Active workspace · ${session.workspaceId}`}
        title={`Xin chào, ${session.name || session.login}`}
        description={
          <>
            GitHub identity dùng chung cho {workspaces.length} workspace. Project,
            integration, member role và dữ liệu vẫn được cô lập theo workspace
            đang active.
          </>
        }
        aside={
          session.avatarUrl ? (
            <img
              className="size-20 rounded-2xl border-4 border-background object-cover shadow-md"
              src={session.avatarUrl}
              alt={session.name || session.login}
            />
          ) : null
        }
      />

      {dashboard.projects.length === 0 ? (
        <Empty>
          <FolderKanban className="size-10 text-primary" />
          <EmptyHeader>
            <EmptyTitle>Chưa có dự án</EmptyTitle>
            <EmptyDescription>
              Tạo dự án đầu tiên trong workspace đang active, sau đó thêm work
              item, Designer Catalog và automation.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline">
              <Link href="/settings/integrations">Cấu hình tích hợp</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.projects.map((project) => (
            <Link href={`/projects/${project.key}`} key={project.key}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="purple">{project.key}</Badge>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {project.progress}%
                    </span>
                  </div>
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-10">
                    {project.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={project.progress} />
                  <dl className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-muted/60 p-3">
                      <dt className="text-xs text-muted-foreground">Work items</dt>
                      <dd className="mt-1 text-xl font-bold">{project.totalItems}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-3">
                      <dt className="text-xs text-muted-foreground">Hoàn thành</dt>
                      <dd className="mt-1 text-xl font-bold">{project.completedItems}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-3">
                      <dt className="text-xs text-muted-foreground">PR mở</dt>
                      <dd className="mt-1 text-xl font-bold">{project.openPrItems}</dd>
                    </div>
                  </dl>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  {project.repositoryFullName ?? "Chưa liên kết repository"}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </section>
      )}

      <ProjectCreateForm />
    </AppPage>
  );
}
