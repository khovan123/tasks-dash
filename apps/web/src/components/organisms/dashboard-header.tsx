import { Button } from "@/components/ui/button";
import { NewProjectModal } from "@/components/organisms/new-project-modal";
import type { DashboardSession } from "@/features/dashboard/types";

export function DashboardHeader({
  session,
  canCreateProject,
}: {
  session: DashboardSession;
  canCreateProject: boolean;
}) {
  return (
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
  );
}
