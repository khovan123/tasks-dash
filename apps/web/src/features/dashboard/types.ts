import type { MemberPresence } from "@tasks-dash/contracts";

export interface DashboardSession {
  login: string;
  name: string;
}

export interface DashboardMember {
  _id?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  status: MemberPresence;
  githubLogin?: string;
  discordUsername?: string;
}

export interface DashboardProject {
  key: string;
  name: string;
  description: string;
  color?: string;
  repositoryFullName?: string;
  progress: number;
  totalItems: number;
  completedItems: number;
  openPrItems: number;
}

export interface DashboardDailyActivity {
  _id: { projectKey: string; day: string };
  created: number;
  completed: number;
}

export interface DashboardOverviewData {
  projects: DashboardProject[];
  members: DashboardMember[];
  dailyActivity: DashboardDailyActivity[];
}

export interface DashboardActivityPoint {
  day: string;
  created: number;
  completed: number;
}

export interface DashboardMetrics {
  projectCount: number;
  completionRate: number;
  completedItems: number;
  totalItems: number;
  openPullRequests: number;
  memberCount: number;
  onlineMembers: number;
}
