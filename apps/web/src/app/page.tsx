import Link from "next/link";
import { apiData, apiResponse } from "@/lib/server/api-data";
import { ProjectCreateForm } from "@/components/project-create-form";
import { LogoutButton } from "@/components/logout-button";
export const dynamic = "force-dynamic";

interface Session {
  login: string;
  name: string;
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
  members: Member[];
}
interface Dashboard {
  projects: Project[];
  members: Member[];
  dailyActivity: Array<{ _id: { projectKey: string; day: string }; created: number; completed: number }>;
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
          <span className="eyebrow">PRODUCTION WORKSPACE</span>
          <h1>Tasks Dash</h1>
          <p>Đăng nhập bằng GitHub để tạo workspace thật. Không có seed data hoặc tài khoản demo.</p>
          <a className="primary link-button" href={`${browserApi.replace(/\/$/, "")}/auth/github/login`}>Đăng nhập với GitHub</a>
          <small>Phiên đăng nhập được lưu trong cookie HttpOnly và workspace được lấy từ session phía server.</small>
        </section>
      </main>
    );
  }

  const sessionPayload = await sessionResponse.json() as { ok: true; data: Session };
  const session = sessionPayload.data;
  const dashboard = await apiData<Dashboard>("/dashboard/overview");

  return (
    <main className="app-page">
      <header className="topbar">
        <div><span className="eyebrow">TASKS DASH</span><strong>Production workspace</strong></div>
        <nav><Link href="/">Tổng quan</Link><Link href="/settings/integrations">Tích hợp</Link><LogoutButton /></nav>
      </header>

      <section className="hero-panel">
        <div>
          <span className="eyebrow">WORKSPACE {session.workspaceId}</span>
          <h1>Xin chào, {session.name || session.login}</h1>
          <p>Dữ liệu dưới đây được đọc trực tiếp từ MongoDB thông qua API đã xác thực.</p>
        </div>
        <img className="profile-avatar" src={session.avatarUrl} alt="" />
      </section>

      {dashboard.projects.length === 0 ? (
        <section className="empty-state">
          <span className="eyebrow">EMPTY WORKSPACE</span>
          <h2>Chưa có dự án</h2>
          <p>Đây là trạng thái thật của workspace mới. Tạo dự án đầu tiên và kết nối GitHub App, Drive, Discord.</p>
          <Link className="secondary link-button" href="/settings/integrations">Cấu hình tích hợp</Link>
        </section>
      ) : (
        <section className="project-grid">
          {dashboard.projects.map((project) => (
            <Link href={`/projects/${project.key}`} className="project-card" key={project.key}>
              <div className="project-card-head"><span className="project-key">{project.key}</span><span>{project.progress}%</span></div>
              <h2>{project.name}</h2>
              <p>{project.description}</p>
              <div className="progress"><span style={{ width: `${project.progress}%` }} /></div>
              <dl>
                <div><dt>Work items</dt><dd>{project.totalItems}</dd></div>
                <div><dt>Hoàn thành</dt><dd>{project.completedItems}</dd></div>
                <div><dt>PR đang mở</dt><dd>{project.openPrItems}</dd></div>
              </dl>
              <small>{project.repositoryFullName ?? "Chưa liên kết repository"}</small>
            </Link>
          ))}
        </section>
      )}

      <ProjectCreateForm />
    </main>
  );
}
