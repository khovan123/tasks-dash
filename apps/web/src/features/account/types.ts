export interface AccountSession {
  login: string;
  name: string;
  email: string;
  avatarUrl?: string;
  workspaceId: string;
}

export interface AccountProfile {
  discordUsername: string | null;
}
