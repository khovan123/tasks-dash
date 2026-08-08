export interface DiscordDocumentFolder {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
}

export interface DiscordDocumentVersion {
  version: number;
  fileName: string;
  mimeType: string;
  size: number;
  messageId: string;
  attachmentId: string;
  openInDiscordUrl: string;
  downloadUrl: string;
  createdAt: string;
}

export interface DiscordDocumentItem {
  id: string;
  name: string;
  description: string;
  tags: string[];
  folderId: string | null;
  currentVersion: number;
  updatedAt: string;
  latestVersion: DiscordDocumentVersion | null;
}

export interface DiscordDocumentTree {
  projectKey: string;
  guildId: string;
  channelId: string;
  channelName: string;
  channelUrl: string;
  maxFileSize: number;
  folders: DiscordDocumentFolder[];
  documents: DiscordDocumentItem[];
}

export interface DocumentDeleteTarget {
  type: "folder" | "document";
  id: string;
  name: string;
}
