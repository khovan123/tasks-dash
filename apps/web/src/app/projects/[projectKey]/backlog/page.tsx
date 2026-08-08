import { BacklogBoard } from "@/components/organisms/backlog-board";
import { AppPage } from "@/components/templates/app-page";
import { loadProjectWorkItemsContext } from "@/features/work-items/server/load-project-work-items-context";

export const dynamic = "force-dynamic";

export default async function BacklogPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const context = await loadProjectWorkItemsContext(projectKey);

  return (
    <AppPage>
      <BacklogBoard
        projectKey={context.key}
        initialItems={context.items}
        statusNames={context.statusNames}
        statuses={context.statuses}
        members={context.members}
        canManageTasks={context.canManageTasks}
      />
    </AppPage>
  );
}
