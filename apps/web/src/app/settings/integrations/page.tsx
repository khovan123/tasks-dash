import Link from "next/link";
import { DiscordConnectForm } from "@/components/discord-connect-form";
import { apiData } from "@/lib/server/api-data";

export const dynamic = "force-dynamic";

interface GithubInstallation {
  installationId: number;
  accountLogin: string;
  repositoryCount: number;
  suspended: boolean;
  synchronizedAt?: string;
}
interface DriveStatus {
  connected: boolean;
  accountEmail?: string;
  workspaceRootFolderName?: string;
  connectedAt?: string;
  lastError?: string | null;
}
interface DiscordStatus {
  projectKey: string;
  webhookName: string;
  channelId: string;
  enabled: boolean;
  lastSuccessAt?: string;
  lastError?: string;
}
interface Project { key: string; name: string }

export default async function IntegrationsPage() {
  const [github, drive, discord, projects] = await Promise.all([
    apiData<GithubInstallation[]>("/integrations/github/status"),
    apiData<DriveStatus>("/integrations/google-drive/status"),
    apiData<DiscordStatus[]>("/integrations/discord/status"),
    apiData<Project[]>("/projects"),
  ]);

  return (
    <main className="app-page">
      <header className="topbar">
        <Link href="/">← Tổng quan</Link>
        <strong>Production integrations</strong>
      </header>
      <section className="hero-panel">
        <div>
          <span className="eyebrow">REAL CONNECTIONS</span>
          <h1>Tích hợp production</h1>
          <p>Mỗi trạng thái được truy vấn từ backend. Secret không được gửi lại trình duyệt.</p>
        </div>
      </section>
      <section className="integration-grid">
        <article className="integration-card">
          <span className="eyebrow">GITHUB APP</span>
          <h2>{github.length ? "Đã kết nối" : "Chưa kết nối"}</h2>
          <p>
            {github.length
              ? github.map((item) => `${item.accountLogin} · ${item.repositoryCount} repositories`).join(", ")
              : "Cài GitHub App để webhook và API repository hoạt động bằng installation token."}
          </p>
          <a className="primary link-button" href="/api/integrations/github/install">
            {github.length ? "Quản lý installation" : "Cài GitHub App"}
          </a>
        </article>
        <article className="integration-card">
          <span className="eyebrow">GOOGLE DRIVE · OWNER ONLY</span>
          <h2>{drive.connected ? "Đã kết nối" : "Chưa kết nối"}</h2>
          <p>
            {drive.connected
              ? `${drive.accountEmail} · root ${drive.workspaceRootFolderName ?? "Tasks Dash"}`
              : "Workspace Owner cấp quyền drive.file một lần. Hệ thống tự tạo root workspace và folder từng project; không link folder ngoài."}
          </p>
          {drive.lastError ? <p className="error">{drive.lastError}</p> : null}
          <a className="primary link-button" href="/api/integrations/google-drive/connect">
            {drive.connected ? "Owner kết nối lại" : "Owner kết nối Drive"}
          </a>
        </article>
        <article className="integration-card">
          <span className="eyebrow">DISCORD</span>
          <h2>{discord.length} dự án đã kết nối</h2>
          <p>
            {discord.length
              ? discord.map((item) => `${item.projectKey}: ${item.webhookName}`).join(", ")
              : "Webhook được xác minh trước khi mã hóa và lưu vào MongoDB."}
          </p>
        </article>
      </section>
      <DiscordConnectForm projectKeys={projects.map((project) => project.key)} />
    </main>
  );
}
