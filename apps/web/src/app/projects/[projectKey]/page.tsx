import Link from "next/link";
import { apiData } from "@/lib/server/api-data";
export const dynamic = "force-dynamic";

interface Project {
  key: string;
  name: string;
  description: string;
  repositoryFullName?: string;
  driveRootFolderId?: string;
}
interface WorkItem {
  key: string;
  summary: string;
  type: string;
  statusId: string;
  priority: string;
  assigneeId?: string;
  github?: { pullRequestNumber?: number; pullRequestUrl?: string; pullRequestState?: string };
}
interface Workflow { name: string; statuses: Array<{ id: string; name: string; category: string }> }

export default async function ProjectPage({ params }: { params: Promise<{ projectKey: string }> }) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [project, items, workflow] = await Promise.all([
    apiData<Project>(`/projects/${key}`),
    apiData<WorkItem[]>(`/projects/${key}/work-items`),
    apiData<Workflow | null>(`/projects/${key}/workflow`),
  ]);

  return (
    <main className="app-page">
      <header className="topbar"><Link href="/">← Tổng quan</Link><nav><Link href={`/projects/${key}/automations`}>Automation</Link><Link href="/settings/integrations">Tích hợp</Link></nav></header>
      <section className="hero-panel">
        <div><span className="project-key">{project.key}</span><h1>{project.name}</h1><p>{project.description}</p></div>
        <div className="project-links"><span>{project.repositoryFullName ?? "Chưa có GitHub repo"}</span><span>{project.driveRootFolderId ? "Drive đã cấu hình" : "Chưa có Drive folder"}</span></div>
      </section>
      <section className="data-card">
        <div className="section-heading"><div><span>LIVE DATABASE</span><h2>Work items</h2></div><strong>{items.length}</strong></div>
        {items.length === 0 ? <p className="empty-inline">Chưa có work item. Không có dữ liệu mẫu được tự động thêm.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Key</th><th>Summary</th><th>Type</th><th>Status</th><th>Priority</th><th>GitHub PR</th></tr></thead><tbody>{items.map((item) => <tr key={item.key}><td><strong>{item.key}</strong></td><td>{item.summary}</td><td>{item.type}</td><td>{workflow?.statuses.find((status) => status.id === item.statusId)?.name ?? item.statusId}</td><td>{item.priority}</td><td>{item.github?.pullRequestUrl ? <a href={item.github.pullRequestUrl} target="_blank" rel="noreferrer">#{item.github.pullRequestNumber} · {item.github.pullRequestState}</a> : "—"}</td></tr>)}</tbody></table></div>
        )}
      </section>
    </main>
  );
}
