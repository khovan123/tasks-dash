import type { GithubWorkItemView } from "@/components/github-work-item-links";
import type { RealtimeWorkItem } from "@/lib/store/realtime-slice";

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

export interface WorkItemView extends RealtimeWorkItem {
  rank?: number;
  labels?: string[];
  github?: GithubWorkItemView;
}

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
