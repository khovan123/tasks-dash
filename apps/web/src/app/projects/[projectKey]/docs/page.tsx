import Link from "next/link";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { FileArchive } from "lucide-react";
import type { DiscordDocumentTree } from "@/components/discord-document-manager";
import { RealtimeDiscordDocumentManager } from "@/components/realtime-discord-document-manager";
import { AppPage } from "@/components/templates/app-page";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  hasWorkspaceRole,
  loadWorkspaceAccess,
} from "@/features/members/server/load-workspace-access";
import { apiData } from "@/lib/server/api-data";
import { redirectIfProjectAccessLost } from "@/lib/server/project-access";

export const dynamic = "force-dynamic";

export default async function ProjectDocsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const { currentRole } = await loadWorkspaceAccess();
  const canManageDocuments = hasWorkspaceRole(currentRole, [
    MEMBER_ROLES.owner,
    MEMBER_ROLES.ba,
  ]);

  let tree: DiscordDocumentTree | null = null;
  let error: string | null = null;
  try {
    tree = await apiData<DiscordDocumentTree>(`/projects/${key}/documents`);
  } catch (cause) {
    redirectIfProjectAccessLost(cause);
    error = cause instanceof Error ? cause.message : "Không thể tải Discord Docs.";
  }

  return (
    <AppPage>
      {tree ? (
        <RealtimeDiscordDocumentManager
          initialTree={tree}
          canManageDocuments={canManageDocuments}
        />
      ) : (
        <Empty className="min-h-80">
          <FileArchive className="size-12 text-primary" />
          <EmptyHeader>
            <EmptyTitle>Discord Docs channel chưa sẵn sàng</EmptyTitle>
            <EmptyDescription>
              {error ??
                "Cài Discord bot, cấu hình Guild/Category và provision project để tạo channel Docs."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/settings/integrations">Cấu hình Discord Bot</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </AppPage>
  );
}
