import Link from "next/link";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceOption } from "@/components/workspace-switcher";
import { apiData } from "@/lib/server/api-data";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const workspaces = await apiData<WorkspaceOption[]>("/workspaces");
  const active = workspaces.find((workspace) => workspace.active);
  const canCreate = active?.role === "OWNER";

  return (
    <main className="app-page">
      <header className="topbar">
        <Link href="/">← Tổng quan</Link>
        <strong>Workspaces của GitHub account</strong>
      </header>

      <section className="hero-panel">
        <div>
          <span className="eyebrow">ONE GITHUB ACCOUNT</span>
          <h1>{workspaces.length} workspace</h1>
          <p>
            Mỗi workspace giữ project, thành viên, GitHub App, Google Drive root và
            Discord riêng. Switch workspace sẽ ký lại session phía server.
          </p>
        </div>
        <WorkspaceSwitcher workspaces={workspaces} />
      </section>

      <section className="project-grid">
        {workspaces.map((workspace) => (
          <article className="project-card" key={workspace.workspaceId}>
            <div className="project-card-head">
              <span className="project-key">{workspace.role}</span>
              <span>{workspace.active ? "Đang sử dụng" : "Có quyền truy cập"}</span>
            </div>
            <h2>{workspace.name}</h2>
            <p>{workspace.slug}</p>
            <small>{workspace.workspaceId}</small>
          </article>
        ))}
      </section>

      {canCreate ? (
        <WorkspaceCreateForm />
      ) : (
        <section className="empty-state">
          <h2>Chuyển sang workspace bạn là Owner</h2>
          <p>
            Chỉ Owner của workspace đang active được tạo workspace mới. Bạn vẫn có
            thể switch giữa tất cả workspace đã tham gia.
          </p>
        </section>
      )}
    </main>
  );
}
