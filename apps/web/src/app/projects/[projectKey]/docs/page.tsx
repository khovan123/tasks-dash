import Link from "next/link";
import { HardDrive } from "lucide-react";
import {
  DriveFileManager,
  type DriveNode,
} from "@/components/drive-file-manager";
import { apiData } from "@/lib/server/api-data";
import {
  AppNav,
  AppPage,
  AppTopbar,
} from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

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
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost"><Link href={`/projects/${key}`}>← {key}</Link></Button>
        <AppNav>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/backlog`}>Backlog</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/designer`}>Designer</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/docs`}>Docs</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link href={`/projects/${key}/automations`}>Automation</Link></Button>
        </AppNav>
      </AppTopbar>

      {!status.connected ? (
        <Empty className="min-h-80">
          <HardDrive className="size-12 text-primary" />
          <EmptyHeader>
            <EmptyTitle>Google Drive chưa được kết nối</EmptyTitle>
            <EmptyDescription>
              Workspace Owner phải cấp quyền một lần. Tasks Dash sẽ tự tạo root
              workspace và folder riêng cho từng project; không hỗ trợ link folder ngoài.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <a href="/api/integrations/google-drive/connect">Owner kết nối Google Drive</a>
            </Button>
          </EmptyContent>
        </Empty>
      ) : tree ? (
        <DriveFileManager
          projectKey={key}
          accountEmail={tree.accountEmail}
          rootFolderId={tree.rootFolderId}
          rootWebViewLink={tree.rootWebViewLink}
          items={tree.items}
        />
      ) : (
        <Empty className="min-h-80">
          <HardDrive className="size-12 text-destructive" />
          <EmptyHeader>
            <EmptyTitle>Chưa thể tải folder dự án</EmptyTitle>
            <EmptyDescription>{error ?? status.lastError ?? "Google Drive tạm thời không khả dụng."}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline"><Link href="/settings/integrations">Kiểm tra tích hợp</Link></Button>
          </EmptyContent>
        </Empty>
      )}
    </AppPage>
  );
}
