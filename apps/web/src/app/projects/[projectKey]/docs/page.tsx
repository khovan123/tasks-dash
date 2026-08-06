import { MEMBER_ROLES, type MemberRole } from "@tasks-dash/contracts";
import { FileArchive } from "lucide-react";
import {
  DiscordDocumentManager,
  type DiscordDocumentTree,
} from "@/components/discord-document-manager";
import type { JiraShellSession } from "@/components/layout/jira-app-shell";
import { apiData } from "@/lib/server/api-data";
import { AppPage } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: MemberRole;
  status: string;
  lastLoginAt?: string;
}

interface WorkspaceInvitation {
  _id: string;
  email: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  lastSentAt?: string;
}

interface WorkspaceMembersResponse {
  workspace: { workspaceId: string; name: string; slug?: string };
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
}

export default async function ProjectDocsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [workspaceMembers, session] = await Promise.all([
    apiData<WorkspaceMembersResponse>("/workspace/members"),
    apiData<JiraShellSession>("/auth/me"),
  ]);
  const currentRole =
    workspaceMembers.members.find((member) => member.email === session.email)
      ?.role ?? null;
  const canManageDocuments =
    currentRole === MEMBER_ROLES.owner || currentRole === MEMBER_ROLES.ba;
  let tree: DiscordDocumentTree | null = null;
  let error: string | null = null;
  try {
    tree = await apiData<DiscordDocumentTree>(`/projects/${key}/documents`);
  } catch (cause) {
    error =
      cause instanceof Error ? cause.message : "Không thể tải Discord Docs.";
  }

  return (
    <AppPage>
      {tree ? (
        <DiscordDocumentManager
          tree={tree}
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
