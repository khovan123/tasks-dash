import { Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DOCUMENT_TYPES, INTEGRATION_TYPES } from "@tasks-dash/contracts";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import { ProjectsService } from "../projects/projects.service";
import { IntegrationStateService } from "./github-app.service";
import { GoogleDriveIntegrationDocument, GoogleDriveIntegrationHydratedDocument } from "./integration.schemas";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
interface GoogleTokenResponse { access_token?: string; refresh_token?: string; error?: string }
interface GoogleDriveFile { id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string }
@Injectable()
export class GoogleDriveAdapter {
  constructor(
    private readonly config: ConfigService,
    private readonly encryption: CredentialEncryptionService,
    private readonly projects: ProjectsService,
    @InjectModel(GoogleDriveIntegrationDocument.name) private readonly integrations: Model<GoogleDriveIntegrationHydratedDocument>,
    private readonly states: IntegrationStateService,
  ) {}
  async connectUrl(workspaceId: string): Promise<string> {
    const state = await this.states.create(workspaceId);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    Object.entries({ client_id: this.config.getOrThrow<string>("GOOGLE_DRIVE_CLIENT_ID"), redirect_uri: this.config.getOrThrow<string>("GOOGLE_DRIVE_REDIRECT_URI"), response_type: "code", access_type: "offline", prompt: "consent", scope: "openid email https://www.googleapis.com/auth/drive.readonly", state }).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  }
  async callback(code: string, state: string): Promise<void> {
    const workspaceId = await this.states.consume(state);
    const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: this.config.getOrThrow<string>("GOOGLE_DRIVE_CLIENT_ID"), client_secret: this.config.getOrThrow<string>("GOOGLE_DRIVE_CLIENT_SECRET"), redirect_uri: this.config.getOrThrow<string>("GOOGLE_DRIVE_REDIRECT_URI"), grant_type: "authorization_code", code }) });
    const token = (await response.json()) as GoogleTokenResponse;
    if (!response.ok || !token.access_token || !token.refresh_token) throw new UnauthorizedException(token.error ?? "Google OAuth did not return an offline refresh token.");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${token.access_token}` } });
    const profile = (await profileResponse.json().catch(() => ({}))) as { email?: string };
    if (!profileResponse.ok || !profile.email) throw new UnauthorizedException("Unable to load the Google account profile.");
    await this.integrations.findOneAndUpdate({ workspaceId }, { workspaceId, encryptedRefreshToken: this.encryption.encrypt(token.refresh_token), accountEmail: profile.email, connectedAt: new Date() }, { upsert: true, new: true, setDefaultsOnInsert: true }).exec();
  }
  async status(workspaceId: string): Promise<Record<string, unknown>> {
    const item = await this.integrations.findOne({ workspaceId }).exec();
    return item ? { connected: true, accountEmail: item.accountEmail, connectedAt: item.connectedAt } : { connected: false };
  }
  private async accessToken(item: GoogleDriveIntegrationDocument): Promise<string> {
    const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: this.config.getOrThrow<string>("GOOGLE_DRIVE_CLIENT_ID"), client_secret: this.config.getOrThrow<string>("GOOGLE_DRIVE_CLIENT_SECRET"), refresh_token: this.encryption.decrypt(item.encryptedRefreshToken), grant_type: "refresh_token" }) });
    const token = (await response.json()) as GoogleTokenResponse;
    if (!response.ok || !token.access_token) throw new ServiceUnavailableException(token.error ?? "Google access token refresh failed.");
    return token.access_token;
  }
  async listTree(workspaceId: string, projectKey: string): Promise<Record<string, unknown>> {
    const [integration, project] = await Promise.all([this.integrations.findOne({ workspaceId }).exec(), this.projects.getByKey(workspaceId, projectKey)]);
    if (!integration) throw new ServiceUnavailableException("Google Drive is not connected.");
    if (!project.driveRootFolderId) throw new NotFoundException(`Project ${projectKey} has no Drive root folder configured.`);
    const token = await this.accessToken(integration);
    const nodes = new Map<string, Record<string, unknown>>();
    const queue: Array<{ id: string; depth: number }> = [{ id: project.driveRootFolderId, depth: 0 }];
    let count = 0;
    while (queue.length && count < 500) {
      const current = queue.shift(); if (!current || current.depth > 8) continue;
      const params = new URLSearchParams({ q: `'${current.id.replace(/'/g, "\\'")}' in parents and trashed = false`, pageSize: "1000", fields: "files(id,name,mimeType,modifiedTime,webViewLink)", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
      const response = await fetch(`${GOOGLE_DRIVE_API}/files?${params.toString()}`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new ServiceUnavailableException(`Google Drive listing failed with HTTP ${response.status}.`);
      for (const file of ((await response.json()) as { files?: GoogleDriveFile[] }).files ?? []) {
        const folder = file.mimeType === "application/vnd.google-apps.folder";
        nodes.set(file.id, { id: file.id, parentId: current.id, name: file.name, type: this.typeOf(file.mimeType), mimeType: file.mimeType, modifiedTime: file.modifiedTime ?? null, webViewLink: file.webViewLink ?? null, children: [] as Record<string, unknown>[] });
        count += 1; if (folder) queue.push({ id: file.id, depth: current.depth + 1 });
      }
    }
    const roots: Record<string, unknown>[] = [];
    for (const node of nodes.values()) { const parent = nodes.get(String(node.parentId)); if (parent) (parent.children as Record<string, unknown>[]).push(node); else roots.push(node); }
    return { rootFolderId: project.driveRootFolderId, source: INTEGRATION_TYPES.googleDrive, accountEmail: integration.accountEmail, truncated: count >= 500, items: roots };
  }
  private typeOf(mime: string): string {
    if (mime === "application/vnd.google-apps.folder") return DOCUMENT_TYPES.folder;
    if (mime === "application/vnd.google-apps.document") return DOCUMENT_TYPES.googleDoc;
    if (mime === "application/vnd.google-apps.spreadsheet") return DOCUMENT_TYPES.googleSheet;
    if (mime === "application/vnd.google-apps.presentation") return DOCUMENT_TYPES.googleSlide;
    return DOCUMENT_TYPES.file;
  }
}
