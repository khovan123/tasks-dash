import Link from "next/link";
import { BacklogBoard } from "@/components/backlog-board";
import type { GithubWorkItemView } from "@/components/github-work-item-links";
import { apiData } from "@/lib/server/api-data";
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
    <main className="app-page">
      <header className="topbar"><Link href={`/projects/${key}`}>← {key}</Link><nav><Link href={`/projects/${key}/designer`}>Designer</Link><Link href={`/projects/${key}/automations`}>Automation</Link></nav></header>
      <section className="hero-panel"><div><span className="eyebrow">ORDERED BACKLOG</span><h1>{key} Backlog</h1><p>Kéo thả hoặc dùng nút lên/xuống để thay đổi thứ tự ưu tiên. Thứ tự được lưu vào MongoDB bằng field rank.</p></div></section>
      <BacklogBoard projectKey={key} initialItems={items} statusNames={statusNames} />
    </main>
  );
}
