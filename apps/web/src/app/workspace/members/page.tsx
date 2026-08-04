import type { MemberRole } from "@tasks-dash/contracts";
import Link from "next/link";
import { WorkspaceMembersManager } from "@/components/workspace-members-manager";
import { apiData } from "@/lib/server/api-data";
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
    <main className="app-page">
      <header className="topbar"><Link href="/">← Tổng quan</Link><strong>Workspace members</strong></header>
      <section className="hero-panel"><div><span className="eyebrow">WORKSPACE LEVEL</span><h1>{data.workspace.name}</h1><p>Thành viên thuộc workspace. Project chỉ chọn lead hoặc assignee từ danh sách này.</p></div></section>
      <WorkspaceMembersManager members={data.members} invitations={data.invitations} />
    </main>
  );
}
