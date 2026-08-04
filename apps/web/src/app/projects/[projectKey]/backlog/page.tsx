import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { BacklogBoard } from "@/components/backlog-board";
import type { GithubWorkItemView } from "@/components/github-work-item-links";
import { apiData } from "@/lib/server/api-data";
import {
  AppNav,
  AppPage,
  AppTopbar,
  PageHero,
} from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface WorkItem {
  key: string;
  summary: string;
  type: string;
  priority: string;
  statusId: string;
  rank: number;
  github?: GithubWorkItemView;
}
interface Workflow {
  statuses: Array<{ id: string; name: string }>;
}

export default async function BacklogPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [items, workflow] = await Promise.all([
    apiData<WorkItem[]>(`/projects/${key}/work-items`),
    apiData<Workflow | null>(`/projects/${key}/workflow`),
  ]);
  const statusNames = Object.fromEntries(
    (workflow?.statuses ?? []).map((status) => [status.id, status.name]),
  );
  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost"><Link href={`/projects/${key}`}>← {key}</Link></Button>
        <AppNav>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/designer`}>Designer</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/automations`}>Automation</Link></Button>
        </AppNav>
      </AppTopbar>
      <PageHero
        eyebrow="Ordered backlog"
        title={`${key} Backlog`}
        description="Kéo thả hoặc dùng nút lên/xuống để thay đổi thứ tự ưu tiên. Thứ tự được lưu vào MongoDB bằng field rank."
        aside={<ListOrdered className="size-14 text-primary" />}
      />
      <BacklogBoard projectKey={key} initialItems={items} statusNames={statusNames} />
    </AppPage>
  );
}
