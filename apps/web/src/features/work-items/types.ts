import type { GithubPullRequestStatus } from "@tasks-dash/contracts";
import type { RealtimeWorkItem } from "@/lib/store/realtime-slice";

export interface WorkItemExternalLink {
  label: string;
  url: string;
}

export interface GithubCommitView {
  sha: string;
  message: string;
  url?: string;
  branch?: string;
  committedAt?: string;
  sources?: string[];
}

export interface GithubPullRequestView {
  number: number;
  title: string;
  url: string;
  state: string;
  status: GithubPullRequestStatus;
  draft: boolean;
  headBranch: string;
  baseBranch: string;
  headSha: string;
  action: string;
  reviewState?: string;
  authorLogin?: string;
  updatedAt?: string;
  closedAt?: string;
  mergedAt?: string;
  sources?: string[];
}

export interface GithubWorkItemView {
  branches?: string[];
  commits?: GithubCommitView[];
  pullRequests?: GithubPullRequestView[];
  branch?: string;
  commitShas?: string[];
  pullRequestNumber?: number;
  pullRequestUrl?: string;
  pullRequestState?: string;
}

export interface WorkItemMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  githubLogin?: string;
  discordUsername?: string;
}

export interface WorkflowStatusView {
  id: string;
  name: string;
  category?: string;
  color?: string;
}

export interface WorkItemView extends Omit<RealtimeWorkItem, "github"> {
  rank?: number;
  labels?: string[];
  figmaLinks?: WorkItemExternalLink[];
  documentLinks?: WorkItemExternalLink[];
  github?: GithubWorkItemView;
}

export type DetailWorkItem = WorkItemView;

export interface ProjectMembersResponse {
  projectMembers: Array<{
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    githubLogin?: string;
    discordUsername?: string;
    role?: string;
  }>;
  workspaceMembers: Array<{
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    githubLogin?: string;
    discordUsername?: string;
    role?: string;
  }>;
}
