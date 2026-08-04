import Link from "next/link";
import { Boxes } from "lucide-react";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import { apiData } from "@/lib/server/api-data";
import {
  AppPage,
  AppTopbar,
  PageHero,
} from "@/components/layout/app-shell";
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
  const active = workspaces.find((workspace) => workspace.active);
  const canCreate = active?.role === "OWNER";

  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost">
          <Link href="/">← Tổng quan</Link>
        </Button>
        <strong>Workspaces của GitHub account</strong>
      </AppTopbar>

      <PageHero
        eyebrow="One GitHub account"
        title={`${workspaces.length} workspace`}
        description="Mỗi workspace giữ project, thành viên, GitHub App, Google Drive root và Discord riêng. Switch workspace sẽ ký lại session phía server."
        aside={<WorkspaceSwitcher workspaces={workspaces} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workspaces.map((workspace) => (
          <Card key={workspace.workspaceId} className={workspace.active ? "border-primary/40" : ""}>
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
            <CardFooter className="text-xs text-muted-foreground">
              {workspace.workspaceId}
            </CardFooter>
          </Card>
        ))}
      </section>

      {canCreate ? (
        <WorkspaceCreateForm />
      ) : (
        <Empty>
          <Boxes className="size-10 text-primary" />
          <EmptyHeader>
            <EmptyTitle>Chuyển sang workspace bạn là Owner</EmptyTitle>
            <EmptyDescription>
              Chỉ Owner của workspace đang active được tạo workspace mới. Bạn vẫn
              có thể switch giữa tất cả workspace đã tham gia.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </AppPage>
  );
}
