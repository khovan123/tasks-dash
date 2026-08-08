import type { MemberRole } from "@tasks-dash/contracts";

export interface WorkspaceMemberView {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  githubLogin?: string;
  discordUsername?: string;
  role: MemberRole;
  status: string;
  lastLoginAt?: string;
}

export interface WorkspaceInvitationView {
  _id: string;
  email: string;
  role: MemberRole;
  status: string;
  expiresAt: string;
  lastSentAt?: string;
}

export interface WorkspaceMembersResponse {
  workspace: {
    workspaceId: string;
    name: string;
    slug?: string;
  };
  members: WorkspaceMemberView[];
  invitations?: WorkspaceInvitationView[];
}
