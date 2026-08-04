import type { MemberRole } from "@tasks-dash/contracts";
import Link from "next/link";
import { WorkspaceMembersManager } from "@/components/workspace-members-manager";
import { apiData } from "@/lib/server/api-data";
import {
  AppNav,
  AppPage,
  AppTopbar,
  PageHero,
} from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

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

export default async function WorkspaceMembersPage() {
  const data = await apiData<WorkspaceMembersResponse>("/workspace/members");
  return (
    <AppPage>
      <AppTopbar>
        <Button asChild variant="ghost">
          <Link href="/">← Tổng quan</Link>
        </Button>
        <AppNav>
          <Button asChild variant="outline" size="sm">
            <Link href="/workspaces">Switch workspace</Link>
          </Button>
          <strong>Workspace members</strong>
        </AppNav>
      </AppTopbar>
      <PageHero
        eyebrow="Workspace level"
        title={data.workspace.name}
        description="Thành viên thuộc workspace active. Một GitHub account có thể có role khác nhau ở từng workspace."
      />
      <WorkspaceMembersManager
        members={data.members}
        invitations={data.invitations}
      />
    </AppPage>
  );
}
