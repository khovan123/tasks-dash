import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { WorkspaceActions } from "@/components/workspace-actions";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import { apiData } from "@/lib/server/api-data";
import { AppPage, AppTopbar, PageHero } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const workspaces = await apiData<WorkspaceOption[]>("/workspaces");

  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost">
          <Link href="/">← Tổng quan</Link>
        </Button>
        <Button asChild>
          <Link href="/workspaces/new">
            <Plus /> Tạo workspace mới
          </Link>
        </Button>
      </AppTopbar>

      <PageHero
        eyebrow="One GitHub account"
        title={`${workspaces.length} workspace`}
        description="Mỗi workspace có tên riêng và cô lập project, thành viên, GitHub App, Discord server, notification channels cùng document storage."
        aside={<WorkspaceSwitcher workspaces={workspaces} />}
      />

      {workspaces.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <Card
              key={workspace.workspaceId}
              className={workspace.active ? "border-primary/40" : ""}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="purple">{workspace.role}</Badge>
                  <Badge variant={workspace.active ? "success" : "secondary"}>
                    {workspace.active ? "Đang sử dụng" : "Có quyền truy cập"}
                  </Badge>
                </div>
                <CardTitle>{workspace.name}</CardTitle>
                <CardDescription>{workspace.slug}</CardDescription>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-3">
                <span className="text-xs text-muted-foreground">
                  {workspace.workspaceId}
                </span>
                {workspace.role === "OWNER" ? (
                  <WorkspaceActions
                    workspaceId={workspace.workspaceId}
                    workspaceName={workspace.name}
                  />
                ) : null}
              </CardFooter>
            </Card>
          ))}
        </section>
      ) : (
        <Empty>
          <Boxes className="size-10 text-primary" />
          <EmptyHeader>
            <EmptyTitle>Chưa có workspace</EmptyTitle>
            <EmptyDescription>
              Tạo workspace đầu tiên để bắt đầu quản lý dự án.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </AppPage>
  );
}
