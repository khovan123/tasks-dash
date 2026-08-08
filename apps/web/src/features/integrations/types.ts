export interface GithubInstallation {
  installationId: number;
  accountLogin: string;
  repositoryCount: number;
}

export interface GithubRepositoryStatus {
  id: number;
  full_name: string;
  html_url: string;
  linkedProjectKey?: string;
}

export interface DiscordWorkspaceStatus {
  botConfigured: boolean;
  configured: boolean;
  guildId?: string | null;
  guildName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  channelNameTemplate: string;
  docsChannelNameTemplate: string;
  enabled: boolean;
  lastProvisionedAt?: string | null;
  lastError?: string | null;
  installUrl?: string | null;
  availableGuilds?: Array<{ id: string; name: string; disabled?: boolean }>;
}

export interface DiscordProjectStatus {
  projectKey: string;
  channelId: string;
  channelName?: string | null;
  docsChannelId?: string | null;
  docsChannelName?: string | null;
  generalChannelId?: string | null;
  generalChannelName?: string | null;
  deploymentChannelId?: string | null;
  deploymentChannelName?: string | null;
  designerChannelId?: string | null;
  designerChannelName?: string | null;
  membersChannelId?: string | null;
  membersChannelName?: string | null;
  reportsChannelId?: string | null;
  reportsChannelName?: string | null;
  meetingChannelId?: string | null;
  meetingChannelName?: string | null;
  provisionedBy?: "BOT" | "MANUAL";
}

export interface DiscordChannelView {
  id: string;
  name?: string | null;
  label: string;
}
