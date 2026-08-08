import { KanbanBoard } from "@/components/organisms/kanban-board";
import { AppPage } from "@/components/templates/app-page";
import { loadProjectWorkItemsContext } from "@/features/work-items/server/load-project-work-items-context";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const context = await loadProjectWorkItemsContext(projectKey);

  return (
    <AppPage>
      <KanbanBoard
        projectKey={context.key}
        initialItems={context.items}
        statuses={context.statuses}
        members={context.members}
        canManageTasks={context.canManageTasks}
        canCompleteSprint={context.canCompleteSprint}
      />
    </AppPage>
  );
}
