import Link from "next/link";
import { apiData, apiResponse } from "@/lib/server/api-data";
import { ProjectCreateForm } from "@/components/project-create-form";
import { LogoutButton } from "@/components/logout-button";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import type { WorkspaceOption } from "@/components/workspace-switcher";
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
  const browserApi = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!browserApi) throw new Error("NEXT_PUBLIC_API_BASE_URL is required.");

  if (sessionResponse.status === 401) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="brand-mark">TD</div>
          <span className="eyebrow">INVITE-ONLY MULTI-WORKSPACE</span>
          <h1>Tasks Dash</h1>
          <p>
            Một GitHub account có thể tham gia nhiều workspace, nhưng workspace mới
            vẫn cần invitation hoặc được Owner tạo từ workspace hiện tại.
          </p>
          <a
            className="primary link-button"
            href={`${browserApi.replace(/\/$/, "")}/auth/github/login`}
          >
            Đăng nhập với GitHub
          </a>
          <small>Thành viên mới phải mở link invitation được gửi qua email.</small>
        </section>
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
    <main className="app-page">
      <header className="topbar">
        <div>
          <span className="eyebrow">TASKS DASH</span>
          <strong>Production workspace</strong>
        </div>
        <nav>
          <WorkspaceSwitcher workspaces={workspaces} compact />
          <Link href="/workspaces">Quản lý workspace</Link>
          <Link href="/workspace/members">
            Thành viên ({dashboard.members.length})
          </Link>
          <Link href="/settings/integrations">Tích hợp</Link>
          <LogoutButton />
        </nav>
      </header>

      <section className="hero-panel">
        <div>
          <span className="eyebrow">ACTIVE WORKSPACE {session.workspaceId}</span>
          <h1>Xin chào, {session.name || session.login}</h1>
          <p>
            GitHub identity dùng chung cho {workspaces.length} workspace. Project,
            integration, member role và dữ liệu vẫn được cô lập theo workspace đang
            active.
          </p>
        </div>
        <img className="profile-avatar" src={session.avatarUrl} alt="" />
      </section>

      {dashboard.projects.length === 0 ? (
        <section className="empty-state">
          <span className="eyebrow">EMPTY WORKSPACE</span>
          <h2>Chưa có dự án</h2>
          <p>
            Tạo dự án đầu tiên trong workspace đang active, sau đó thêm work item,
            Designer Catalog và automation.
          </p>
          <Link className="secondary link-button" href="/settings/integrations">
            Cấu hình tích hợp
          </Link>
        </section>
      ) : (
        <section className="project-grid">
          {dashboard.projects.map((project) => (
            <Link
              href={`/projects/${project.key}`}
              className="project-card"
              key={project.key}
            >
              <div className="project-card-head">
                <span className="project-key">{project.key}</span>
                <span>{project.progress}%</span>
              </div>
              <h2>{project.name}</h2>
              <p>{project.description}</p>
              <div className="progress">
                <span style={{ width: `${project.progress}%` }} />
              </div>
              <dl>
                <div><dt>Work items</dt><dd>{project.totalItems}</dd></div>
                <div><dt>Hoàn thành</dt><dd>{project.completedItems}</dd></div>
                <div><dt>PR đang mở</dt><dd>{project.openPrItems}</dd></div>
              </dl>
              <small>
                {project.repositoryFullName ?? "Chưa liên kết repository"}
              </small>
            </Link>
          ))}
        </section>
      )}

      <ProjectCreateForm />
    </main>
  );
}
