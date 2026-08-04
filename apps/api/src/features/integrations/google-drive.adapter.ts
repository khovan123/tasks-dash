import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DOCUMENT_TYPES, INTEGRATION_TYPES } from "@tasks-dash/contracts";
import { CredentialEncryptionService } from "../../common/security/credential-encryption.service";
import {
  WorkspaceDocument,
  WorkspaceHydratedDocument,
} from "../members/workspace.schema";
import {
  PROJECT_CREATED_EVENT,
  ProjectCreatedEvent,
  ProjectsService,
} from "../projects/projects.service";
import { DriveOauthStateService } from "./drive-oauth-state.service";
import {
  GoogleDriveIntegrationDocument,
  GoogleDriveIntegrationHydratedDocument,
} from "./integration.schemas";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_FOLDER_MIME = "application/vnd.google-apps.folder";
const WORKSPACE_PROPERTY = "tasksDashWorkspaceId";
const PROJECT_PROPERTY = "tasksDashProjectKey";

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  trashed?: boolean;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
  appProperties?: Record<string, string>;
}

export interface UploadedDriveFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

function escapeQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

@Injectable()
export class GoogleDriveAdapter {
  constructor(
    private readonly config: ConfigService,
    private readonly encryption: CredentialEncryptionService,
    private readonly projects: ProjectsService,
    @InjectModel(GoogleDriveIntegrationDocument.name)
    private readonly integrations: Model<GoogleDriveIntegrationHydratedDocument>,
    @InjectModel(WorkspaceDocument.name)
    private readonly workspaces: Model<WorkspaceHydratedDocument>,
    private readonly states: DriveOauthStateService,
  ) {}

  async connectUrl(workspaceId: string, memberId: string): Promise<string> {
    const state = await this.states.create(workspaceId, memberId);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    const values = {
      client_id: this.config.getOrThrow<string>("GOOGLE_DRIVE_CLIENT_ID"),
      redirect_uri: this.config.getOrThrow<string>("GOOGLE_DRIVE_REDIRECT_URI"),
      response_type: "code",
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      scope: `openid email ${GOOGLE_DRIVE_SCOPE}`,
      state,
    };
    Object.entries(values).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );
    return url.toString();
  }

  async callback(code: string, state: string): Promise<void> {
    const { workspaceId, memberId } = await this.states.consume(state);
    const existing = await this.integrations.findOne({ workspaceId }).exec();
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.getOrThrow<string>("GOOGLE_DRIVE_CLIENT_ID"),
        client_secret: this.config.getOrThrow<string>(
          "GOOGLE_DRIVE_CLIENT_SECRET",
        ),
        redirect_uri: this.config.getOrThrow<string>(
          "GOOGLE_DRIVE_REDIRECT_URI",
        ),
        grant_type: "authorization_code",
        code,
      }),
    });
    const token = (await response.json().catch(() => ({}))) as GoogleTokenResponse;
    if (!response.ok || !token.access_token) {
      throw new UnauthorizedException(
        token.error_description ?? token.error ?? "Google OAuth failed.",
      );
    }
    const encryptedRefreshToken = token.refresh_token
      ? this.encryption.encrypt(token.refresh_token)
      : existing?.encryptedRefreshToken;
    if (!encryptedRefreshToken) {
      throw new UnauthorizedException(
        "Google OAuth did not return an offline refresh token.",
      );
    }

    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { authorization: `Bearer ${token.access_token}` } },
    );
    const profile = (await profileResponse.json().catch(() => ({}))) as {
      email?: string;
    };
    if (!profileResponse.ok || !profile.email) {
      throw new UnauthorizedException(
        "Unable to load the connected Google account profile.",
      );
    }
    const workspace = await this.workspaces.findOne({ workspaceId }).exec();
    if (!workspace) throw new NotFoundException("Workspace was not found.");

    const root = await this.ensureWorkspaceRoot(
      token.access_token,
      workspaceId,
      workspace.name,
    );
    const integration = await this.integrations
      .findOneAndUpdate(
        { workspaceId },
        {
          $set: {
            workspaceId,
            encryptedRefreshToken,
            accountEmail: profile.email.toLowerCase(),
            connectedByMemberId: memberId,
            workspaceRootFolderId: root.id,
            workspaceRootFolderName: root.name,
            scope: GOOGLE_DRIVE_SCOPE,
            connectedAt: new Date(),
            synchronizedAt: new Date(),
          },
          $unset: { lastError: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    const projects = await this.projects.list(workspaceId);
    for (const project of projects) {
      await this.ensureProjectFolderWithToken(
        integration,
        token.access_token,
        project.key,
      );
    }
  }

  async status(workspaceId: string): Promise<Record<string, unknown>> {
    const item = await this.integrations.findOne({ workspaceId }).exec();
    return item
      ? {
          connected: true,
          accountEmail: item.accountEmail,
          connectedByMemberId: item.connectedByMemberId,
          workspaceRootFolderId: item.workspaceRootFolderId,
          workspaceRootFolderName: item.workspaceRootFolderName,
          connectedAt: item.connectedAt,
          synchronizedAt: item.synchronizedAt ?? null,
          lastError: item.lastError ?? null,
        }
      : { connected: false };
  }

  @OnEvent(PROJECT_CREATED_EVENT, { async: true })
  async onProjectCreated(event: ProjectCreatedEvent): Promise<void> {
    const integration = await this.integrations
      .findOne({ workspaceId: event.workspaceId })
      .exec();
    if (!integration) return;
    try {
      const token = await this.accessToken(integration);
      await this.ensureProjectFolderWithToken(
        integration,
        token,
        event.projectKey,
      );
      await this.integrations
        .updateOne(
          { _id: integration._id },
          { $set: { synchronizedAt: new Date() }, $unset: { lastError: 1 } },
        )
        .exec();
    } catch (error) {
      await this.integrations
        .updateOne(
          { _id: integration._id },
          {
            $set: {
              lastError:
                error instanceof Error ? error.message : "Drive provisioning failed",
            },
          },
        )
        .exec();
      throw error;
    }
  }

  async ensureProjectFolder(
    workspaceId: string,
    projectKey: string,
  ): Promise<GoogleDriveFile> {
    const integration = await this.integration(workspaceId);
    const token = await this.accessToken(integration);
    return this.ensureProjectFolderWithToken(integration, token, projectKey);
  }

  async listTree(
    workspaceId: string,
    projectKey: string,
  ): Promise<Record<string, unknown>> {
    const integration = await this.integration(workspaceId);
    const token = await this.accessToken(integration);
    const root = await this.ensureProjectFolderWithToken(
      integration,
      token,
      projectKey,
    );
    const rootNode = this.toNode(root);
    rootNode.children = await this.listChildren(token, root.id, 0, 500);
    return {
      rootFolderId: root.id,
      rootFolderName: root.name,
      rootWebViewLink: root.webViewLink ?? null,
      workspaceRootFolderId: integration.workspaceRootFolderId,
      source: INTEGRATION_TYPES.googleDrive,
      accountEmail: integration.accountEmail,
      items: [rootNode],
    };
  }

  async createFolder(
    workspaceId: string,
    projectKey: string,
    name: string,
    parentId?: string,
  ): Promise<Record<string, unknown>> {
    const { integration, token, root } = await this.context(
      workspaceId,
      projectKey,
    );
    const parent = parentId || root.id;
    await this.assertFolderInsideProject(token, root.id, parent);
    const folder = await this.createDriveFile(token, {
      name: name.trim(),
      mimeType: GOOGLE_FOLDER_MIME,
      parents: [parent],
      appProperties: this.projectProperties(workspaceId, projectKey),
    });
    integration.synchronizedAt = new Date();
    await integration.save();
    return this.toNode(folder);
  }

  async renameItem(
    workspaceId: string,
    projectKey: string,
    fileId: string,
    name: string,
  ): Promise<Record<string, unknown>> {
    const { token, root } = await this.context(workspaceId, projectKey);
    await this.assertInsideProject(token, root.id, fileId, false);
    const file = await this.driveJson<GoogleDriveFile>(
      token,
      `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(
        fileId,
      )}?fields=${encodeURIComponent(this.fileFields())}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      },
    );
    return this.toNode(file);
  }

  async deleteItem(
    workspaceId: string,
    projectKey: string,
    fileId: string,
  ): Promise<void> {
    const { token, root } = await this.context(workspaceId, projectKey);
    await this.assertInsideProject(token, root.id, fileId, false);
    await this.driveJson<GoogleDriveFile>(
      token,
      `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(fileId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trashed: true }),
      },
    );
  }

  async uploadFile(
    workspaceId: string,
    projectKey: string,
    file: UploadedDriveFile,
    parentId?: string,
  ): Promise<Record<string, unknown>> {
    if (!file?.buffer?.length) throw new BadRequestException("File is required.");
    const { token, root } = await this.context(workspaceId, projectKey);
    const parent = parentId || root.id;
    await this.assertFolderInsideProject(token, root.id, parent);
    const boundary = `tasks_dash_${Date.now()}_${Math.random()
      .toString(16)
      .slice(2)}`;
    const metadata = JSON.stringify({
      name: file.originalname,
      parents: [parent],
      appProperties: this.projectProperties(workspaceId, projectKey),
    });
    const start = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${
        file.mimetype || "application/octet-stream"
      }\r\n\r\n`,
    );
    const end = Buffer.from(`\r\n--${boundary}--`);
    const body = Buffer.concat([start, file.buffer, end]);
    const uploaded = await this.driveJson<GoogleDriveFile>(
      token,
      `${GOOGLE_DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=${encodeURIComponent(
        this.fileFields(),
      )}`,
      {
        method: "POST",
        headers: { "content-type": `multipart/related; boundary=${boundary}` },
        body: new Uint8Array(body),
      },
    );
    return this.toNode(uploaded);
  }

  private async context(workspaceId: string, projectKey: string): Promise<{
    integration: GoogleDriveIntegrationHydratedDocument;
    token: string;
    root: GoogleDriveFile;
  }> {
    const integration = await this.integration(workspaceId);
    const token = await this.accessToken(integration);
    const root = await this.ensureProjectFolderWithToken(
      integration,
      token,
      projectKey,
    );
    return { integration, token, root };
  }

  private async integration(
    workspaceId: string,
  ): Promise<GoogleDriveIntegrationHydratedDocument> {
    const integration = await this.integrations.findOne({ workspaceId }).exec();
    if (!integration) {
      throw new ServiceUnavailableException(
        "The workspace Owner has not connected Google Drive.",
      );
    }
    return integration;
  }

  private async accessToken(
    item: GoogleDriveIntegrationDocument,
  ): Promise<string> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.config.getOrThrow<string>("GOOGLE_DRIVE_CLIENT_ID"),
        client_secret: this.config.getOrThrow<string>(
          "GOOGLE_DRIVE_CLIENT_SECRET",
        ),
        refresh_token: this.encryption.decrypt(item.encryptedRefreshToken),
        grant_type: "refresh_token",
      }),
    });
    const token = (await response.json().catch(() => ({}))) as GoogleTokenResponse;
    if (!response.ok || !token.access_token) {
      throw new ServiceUnavailableException(
        token.error_description ??
          token.error ??
          "Google access token refresh failed.",
      );
    }
    return token.access_token;
  }

  private async ensureWorkspaceRoot(
    token: string,
    workspaceId: string,
    workspaceName: string,
  ): Promise<GoogleDriveFile> {
    const query = [
      `mimeType = '${GOOGLE_FOLDER_MIME}'`,
      "trashed = false",
      `appProperties has { key='${WORKSPACE_PROPERTY}' and value='${escapeQuery(
        workspaceId,
      )}' }`,
    ].join(" and ");
    const matches = await this.searchFiles(token, query);
    if (matches[0]) return matches[0];
    return this.createDriveFile(token, {
      name: `Tasks Dash - ${workspaceName}`,
      mimeType: GOOGLE_FOLDER_MIME,
      appProperties: { [WORKSPACE_PROPERTY]: workspaceId },
    });
  }

  private async ensureProjectFolderWithToken(
    integration: GoogleDriveIntegrationHydratedDocument,
    token: string,
    projectKey: string,
  ): Promise<GoogleDriveFile> {
    const project = await this.projects.getByKey(
      integration.workspaceId,
      projectKey,
    );
    const query = [
      `'${escapeQuery(integration.workspaceRootFolderId)}' in parents`,
      `mimeType = '${GOOGLE_FOLDER_MIME}'`,
      "trashed = false",
      `appProperties has { key='${WORKSPACE_PROPERTY}' and value='${escapeQuery(
        integration.workspaceId,
      )}' }`,
      `appProperties has { key='${PROJECT_PROPERTY}' and value='${escapeQuery(
        project.key,
      )}' }`,
    ].join(" and ");
    const matches = await this.searchFiles(token, query);
    const expectedName = `${project.key} - ${project.name}`;
    let folder = matches[0];
    if (!folder) {
      folder = await this.createDriveFile(token, {
        name: expectedName,
        mimeType: GOOGLE_FOLDER_MIME,
        parents: [integration.workspaceRootFolderId],
        appProperties: this.projectProperties(
          integration.workspaceId,
          project.key,
        ),
      });
    } else if (folder.name !== expectedName) {
      folder = await this.driveJson<GoogleDriveFile>(
        token,
        `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(
          folder.id,
        )}?fields=${encodeURIComponent(this.fileFields())}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: expectedName }),
        },
      );
    }
    await this.projects.linkDriveFolder(integration.workspaceId, project.key, {
      id: folder.id,
      name: folder.name,
      webViewLink: folder.webViewLink,
    });
    return folder;
  }

  private projectProperties(
    workspaceId: string,
    projectKey: string,
  ): Record<string, string> {
    return {
      [WORKSPACE_PROPERTY]: workspaceId,
      [PROJECT_PROPERTY]: projectKey.toUpperCase(),
    };
  }

  private async assertFolderInsideProject(
    token: string,
    rootId: string,
    folderId: string,
  ): Promise<void> {
    const folder = await this.assertInsideProject(token, rootId, folderId, true);
    if (folder.mimeType !== GOOGLE_FOLDER_MIME) {
      throw new BadRequestException("The selected parent is not a folder.");
    }
  }

  private async assertInsideProject(
    token: string,
    rootId: string,
    fileId: string,
    allowRoot: boolean,
  ): Promise<GoogleDriveFile> {
    if (fileId === rootId) {
      if (!allowRoot) {
        throw new ForbiddenException(
          "The system-managed project root folder cannot be modified or deleted.",
        );
      }
      return this.getFile(token, rootId);
    }
    let current = await this.getFile(token, fileId);
    const original = current;
    for (let depth = 0; depth < 32; depth += 1) {
      if (current.trashed) throw new NotFoundException("Drive item was not found.");
      const parent = current.parents?.[0];
      if (!parent) break;
      if (parent === rootId) return original;
      current = await this.getFile(token, parent);
    }
    throw new ForbiddenException(
      "Drive operations are restricted to the managed project folder.",
    );
  }

  private async getFile(token: string, fileId: string): Promise<GoogleDriveFile> {
    return this.driveJson<GoogleDriveFile>(
      token,
      `${GOOGLE_DRIVE_API}/files/${encodeURIComponent(
        fileId,
      )}?fields=${encodeURIComponent(this.fileFields())}`,
    );
  }

  private async listChildren(
    token: string,
    parentId: string,
    depth: number,
    remaining: number,
  ): Promise<Record<string, unknown>[]> {
    if (depth >= 8 || remaining <= 0) return [];
    const query = `'${escapeQuery(parentId)}' in parents and trashed = false`;
    const files = await this.searchFiles(token, query);
    const output: Record<string, unknown>[] = [];
    for (const file of files.slice(0, remaining)) {
      const node = this.toNode(file);
      node.children =
        file.mimeType === GOOGLE_FOLDER_MIME
          ? await this.listChildren(
              token,
              file.id,
              depth + 1,
              remaining - output.length - 1,
            )
          : [];
      output.push(node);
    }
    return output;
  }

  private async searchFiles(
    token: string,
    query: string,
  ): Promise<GoogleDriveFile[]> {
    const params = new URLSearchParams({
      q: query,
      pageSize: "1000",
      orderBy: "folder,name_natural",
      fields: `files(${this.fileFields()})`,
      spaces: "drive",
    });
    const response = await this.driveJson<{ files?: GoogleDriveFile[] }>(
      token,
      `${GOOGLE_DRIVE_API}/files?${params.toString()}`,
    );
    return response.files ?? [];
  }

  private async createDriveFile(
    token: string,
    metadata: Record<string, unknown>,
  ): Promise<GoogleDriveFile> {
    return this.driveJson<GoogleDriveFile>(
      token,
      `${GOOGLE_DRIVE_API}/files?fields=${encodeURIComponent(this.fileFields())}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(metadata),
      },
    );
  }

  private async driveJson<T>(
    token: string,
    url: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });
    const body = (await response.json().catch(() => ({}))) as T & {
      error?: { message?: string };
    };
    if (!response.ok) {
      throw new ServiceUnavailableException(
        body.error?.message ??
          `Google Drive request failed with HTTP ${response.status}.`,
      );
    }
    return body;
  }

  private fileFields(): string {
    return "id,name,mimeType,parents,trashed,createdTime,modifiedTime,webViewLink,iconLink,size,appProperties";
  }

  private toNode(file: GoogleDriveFile): Record<string, unknown> {
    return {
      id: file.id,
      name: file.name,
      type: this.typeOf(file.mimeType),
      mimeType: file.mimeType,
      parents: file.parents ?? [],
      modifiedTime: file.modifiedTime ?? null,
      createdTime: file.createdTime ?? null,
      webViewLink: file.webViewLink ?? null,
      iconLink: file.iconLink ?? null,
      size: file.size ? Number(file.size) : null,
      children: [] as Record<string, unknown>[],
    };
  }

  private typeOf(mime: string): string {
    if (mime === GOOGLE_FOLDER_MIME) return DOCUMENT_TYPES.folder;
    if (mime === "application/vnd.google-apps.document") {
      return DOCUMENT_TYPES.googleDoc;
    }
    if (mime === "application/vnd.google-apps.spreadsheet") {
      return DOCUMENT_TYPES.googleSheet;
    }
    if (mime === "application/vnd.google-apps.presentation") {
      return DOCUMENT_TYPES.googleSlide;
    }
    return DOCUMENT_TYPES.file;
  }
}
