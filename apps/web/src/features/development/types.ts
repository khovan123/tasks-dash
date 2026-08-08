export interface DevelopmentPullRequest {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  headBranch: string;
  baseBranch: string;
  headSha: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  assigneeLogin: string | null;
  assigneeAvatarUrl: string | null;
  commitsCount: number;
  changedFilesCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  checkState: "success" | "failure" | "pending" | null;
}

export interface DevelopmentMember {
  _id: string;
  email: string;
  role: string;
}

export interface DevelopmentMembersResponse {
  projectMembers: DevelopmentMember[];
  workspaceMembers: DevelopmentMember[];
}

export interface DevelopmentPageContext {
  key: string;
  pullRequests: DevelopmentPullRequest[];
  env: Record<string, string>;
  canUpdate: boolean;
  isOwner: boolean;
}
