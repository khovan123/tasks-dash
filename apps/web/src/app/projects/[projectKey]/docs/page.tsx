import Link from "next/link";
import {
  DriveFileManager,
  type DriveNode,
} from "@/components/drive-file-manager";
import { apiData } from "@/lib/server/api-data";

export const dynamic = "force-dynamic";

interface DriveStatus {
  connected: boolean;
  accountEmail?: string;
  workspaceRootFolderName?: string;
  lastError?: string | null;
}

interface DriveTree {
  rootFolderId: string;
  rootFolderName: string;
  rootWebViewLink?: string | null;
  accountEmail: string;
  items: DriveNode[];
}

export default async function ProjectDocsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const status = await apiData<DriveStatus>("/integrations/google-drive/status");

  let tree: DriveTree | null = null;
  let error: string | null = null;
  if (status.connected) {
    try {
      tree = await apiData<DriveTree>(
        `/integrations/google-drive/projects/${key}/tree`,
      );
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Không thể tải Google Drive.";
    }
  }

  return (
    <main className="app-page">
      <header className="topbar">
        <Link href={`/projects/${key}`}>← {key}</Link>
        <nav>
          <Link href={`/projects/${key}/backlog`}>Backlog</Link>
          <Link href={`/projects/${key}/designer`}>Designer</Link>
          <Link href={`/projects/${key}/docs`}>Docs</Link>
          <Link href={`/projects/${key}/automations`}>Automation</Link>
        </nav>
      </header>

      {!status.connected ? (
        <section className="empty-state">
          <span className="eyebrow">OWNER AUTHORIZATION REQUIRED</span>
          <h1>Google Drive chưa được kết nối</h1>
          <p>
            Workspace Owner phải cấp quyền một lần. Tasks Dash sẽ tự tạo root
            workspace và folder riêng cho từng project; không hỗ trợ link folder
            ngoài.
          </p>
          <a
            className="primary link-button"
            href="/api/integrations/google-drive/connect"
          >
            Owner kết nối Google Drive
          </a>
        </section>
      ) : tree ? (
        <DriveFileManager
          projectKey={key}
          accountEmail={tree.accountEmail}
          rootFolderId={tree.rootFolderId}
          rootWebViewLink={tree.rootWebViewLink}
          items={tree.items}
        />
      ) : (
        <section className="empty-state">
          <span className="eyebrow">DRIVE PROVISIONING ERROR</span>
          <h1>Chưa thể tải folder dự án</h1>
          <p>{error ?? status.lastError ?? "Google Drive tạm thời không khả dụng."}</p>
          <Link className="secondary link-button" href="/settings/integrations">
            Kiểm tra tích hợp
          </Link>
        </section>
      )}
    </main>
  );
}
