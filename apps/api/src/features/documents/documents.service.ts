import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { ProjectsService } from "../projects/projects.service";
import { DiscordAdapter } from "../integrations/discord.adapter";
import { MemberDocument, MemberHydratedDocument } from "../members/member.schema";
import {
  CreateDocumentFolderDto,
  RenameDocumentFolderDto,
  UpdateDocumentDto,
  UploadDocumentDto,
} from "./documents.dto";
import {
  DocumentDocument,
  DocumentFolderDocument,
  DocumentFolderHydratedDocument,
  DocumentHydratedDocument,
  DocumentVersionDocument,
  DocumentVersionHydratedDocument,
} from "./documents.schema";

const DISCORD_API_BASE = "https://discord.com/api/v10";
export const DISCORD_DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface UploadedDiscordDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface DiscordAttachment {
  id: string;
  filename: string;
  content_type?: string;
  size: number;
  url: string;
  proxy_url?: string;
}
interface DiscordMessage {
  id: string;
  channel_id: string;
  guild_id?: string;
  attachments: DiscordAttachment[];
}
interface DiscordApiError {
  message?: string;
  retry_after?: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentFolderDocument.name)
    private readonly folders: Model<DocumentFolderHydratedDocument>,
    @InjectModel(DocumentDocument.name)
    private readonly documents: Model<DocumentHydratedDocument>,
    @InjectModel(DocumentVersionDocument.name)
    private readonly versions: Model<DocumentVersionHydratedDocument>,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberHydratedDocument>,
    private readonly projects: ProjectsService,
    private readonly config: ConfigService,
    private readonly discord: DiscordAdapter,
  ) {}

  private async botRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set(
      "authorization",
      `Bot ${this.config.getOrThrow<string>("DISCORD_BOT_TOKEN")}`,
    );
    headers.set("user-agent", "Tasks-Dash/1.0");
    const request = () => fetch(`${DISCORD_API_BASE}${path}`, { ...init, headers });
    let response = await request();
    if (response.status === 429) {
      const rate = (await response.json().catch(() => ({ retry_after: 1 }))) as DiscordApiError;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(Math.max(Number(rate.retry_after ?? 1) * 1000, 250), 5000)),
      );
      response = await request();
    }
    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as DiscordApiError;
      throw new ServiceUnavailableException(
        detail.message ?? `Discord API failed with HTTP ${response.status}.`,
      );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  private async deleteDiscordMessage(channelId: string, messageId: string): Promise<void> {
    const response = await fetch(
      `${DISCORD_API_BASE}/channels/${channelId}/messages/${messageId}`,
      {
        method: "DELETE",
        headers: {
          authorization: `Bot ${this.config.getOrThrow<string>("DISCORD_BOT_TOKEN")}`,
          "user-agent": "Tasks-Dash/1.0",
        },
      },
    );
    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException(
        `Discord message deletion failed with HTTP ${response.status}.`,
      );
    }
  }

  private async projectContext(workspaceId: string, projectKey: string) {
    const project = await this.projects.getByKey(workspaceId, projectKey);
    if (!project.discordGuildId || !project.discordDocsChannelId) {
      throw new ServiceUnavailableException(
        "Discord Docs channel is not provisioned for this project. Configure the workspace Discord bot and provision the project.",
      );
    }
    return {
      project,
      guildId: project.discordGuildId,
      channelId: project.discordDocsChannelId,
      channelName: project.discordDocsChannelName ?? `${project.key.toLowerCase()}-docs`,
    };
  }

  private async folderById(
    workspaceId: string,
    projectKey: string,
    folderId: string,
  ): Promise<DocumentFolderHydratedDocument> {
    if (!isValidObjectId(folderId)) throw new BadRequestException("Invalid folder id.");
    const folder = await this.folders
      .findOne({ _id: folderId, workspaceId, projectKey: projectKey.toUpperCase() })
      .exec();
    if (!folder) throw new NotFoundException("Document folder was not found.");
    return folder;
  }

  private async documentById(
    workspaceId: string,
    projectKey: string,
    documentId: string,
  ): Promise<DocumentHydratedDocument> {
    if (!isValidObjectId(documentId)) throw new BadRequestException("Invalid document id.");
    const document = await this.documents
      .findOne({ _id: documentId, workspaceId, projectKey: projectKey.toUpperCase() })
      .exec();
    if (!document) throw new NotFoundException("Document was not found.");
    return document;
  }

  private normalizedTags(value?: string): string[] {
    return (value ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  async list(workspaceId: string, projectKey: string): Promise<Record<string, unknown>> {
    const context = await this.projectContext(workspaceId, projectKey);
    const [folders, documents, versions] = await Promise.all([
      this.folders.find({ workspaceId, projectKey: context.project.key }).sort({ name: 1 }).lean().exec(),
      this.documents.find({ workspaceId, projectKey: context.project.key }).sort({ name: 1 }).lean().exec(),
      this.versions.find({ workspaceId, projectKey: context.project.key }).sort({ version: -1 }).lean().exec(),
    ]);
    const latestByDocument = new Map<string, (typeof versions)[number]>();
    for (const version of versions) {
      if (!latestByDocument.has(version.documentId)) latestByDocument.set(version.documentId, version);
    }
    return {
      projectKey: context.project.key,
      guildId: context.guildId,
      channelId: context.channelId,
      channelName: context.channelName,
      channelUrl: `https://discord.com/channels/${context.guildId}/${context.channelId}`,
      maxFileSize: DISCORD_DOCUMENT_MAX_FILE_SIZE,
      folders: folders.map((folder) => ({
        id: String(folder._id),
        name: folder.name,
        parentFolderId: folder.parentFolderId ?? null,
        createdAt: folder.createdAt,
      })),
      documents: documents.map((document) => {
        const version = latestByDocument.get(String(document._id));
        return {
          id: String(document._id),
          name: document.name,
          description: document.description,
          tags: document.tags,
          folderId: document.folderId ?? null,
          currentVersion: document.currentVersion,
          updatedAt: document.updatedAt,
          latestVersion: version
            ? {
                version: version.version,
                fileName: version.fileName,
                mimeType: version.mimeType,
                size: version.size,
                messageId: version.discordMessageId,
                attachmentId: version.discordAttachmentId,
                openInDiscordUrl: `https://discord.com/channels/${version.discordGuildId}/${version.discordChannelId}/${version.discordMessageId}`,
                downloadUrl: `/api/projects/${context.project.key}/documents/${String(document._id)}/download`,
                createdAt: version.createdAt,
              }
            : null,
        };
      }),
    };
  }

  private async resolveActorMention(
    workspaceId: string,
    guildId: string,
    actorId: string,
  ): Promise<{ mention: string; text: string }> {
    try {
      const member = await this.members.findOne({ _id: actorId, workspaceId }).exec();
      if (member) {
        if (member.discordUsername) {
          const discordId = await this.discord.findGuildMemberId(
            guildId,
            member.discordUsername,
          );
          if (discordId) {
            return {
              mention: `<@${discordId}>`,
              text: `@${member.discordUsername}`,
            };
          }
          return {
            mention: `@${member.discordUsername}`,
            text: `@${member.discordUsername}`,
          };
        }
        const textName = member.githubLogin || member.email || "Unknown";
        return { mention: `@${textName}`, text: `@${textName}` };
      }
    } catch (e) {
      console.error("Failed to resolve actor mention:", e);
    }
    return { mention: "@unknown", text: "@unknown" };
  }

  private async sendDocLog(
    channelId: string,
    title: string,
    description: string,
    color = 0x3b82f6,
    mention?: string | null,
  ) {
    try {
      const userIds = mention ? (mention.match(/\d{17,21}/g) || []) : [];
      await this.botRequest(`/channels/${channelId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(mention ? { content: mention } : {}),
          embeds: [
            {
              title,
              description,
              color,
              timestamp: new Date().toISOString(),
            },
          ],
          allowed_mentions: userIds.length > 0
            ? { parse: [], users: userIds }
            : { parse: [] },
        }),
      });
    } catch (e) {
      console.error("Failed to send doc log to Discord:", e);
    }
  }

  async createFolder(
    workspaceId: string,
    projectKey: string,
    actorId: string,
    dto: CreateDocumentFolderDto,
  ): Promise<Record<string, unknown>> {
    const context = await this.projectContext(workspaceId, projectKey);
    const parentFolderId = dto.parentFolderId?.trim() || undefined;
    if (parentFolderId) await this.folderById(workspaceId, context.project.key, parentFolderId);
    try {
      const folder = await this.folders.create({
        workspaceId,
        projectKey: context.project.key,
        parentFolderId,
        name: dto.name.trim(),
        createdByMemberId: actorId,
      });
      const actorMention = await this.resolveActorMention(workspaceId, context.guildId, actorId);
      await this.sendDocLog(
        context.channelId,
        "Folder Created",
        `📁 Folder **${folder.name}** was created by ${actorMention.mention}.`,
        0x3b82f6,
        actorMention.mention,
      );
      return { id: String(folder._id), name: folder.name, parentFolderId: folder.parentFolderId ?? null };
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException("A folder with this name already exists in the selected folder.");
      }
      throw error;
    }
  }

  async renameFolder(
    workspaceId: string,
    projectKey: string,
    folderId: string,
    actorId: string,
    dto: RenameDocumentFolderDto,
  ): Promise<Record<string, unknown>> {
    const context = await this.projectContext(workspaceId, projectKey);
    const folder = await this.folderById(workspaceId, projectKey, folderId);
    folder.name = dto.name.trim();
    await folder.save();
    const actorMention = await this.resolveActorMention(workspaceId, context.guildId, actorId);
    await this.sendDocLog(
      context.channelId,
      "Folder Renamed",
      `📁 Folder renamed to **${folder.name}** by ${actorMention.mention}.`,
      0x3b82f6,
      actorMention.mention,
    );
    return { id: String(folder._id), name: folder.name };
  }

  async deleteFolder(
    workspaceId: string,
    projectKey: string,
    folderId: string,
    actorId: string,
  ): Promise<void> {
    const context = await this.projectContext(workspaceId, projectKey);
    const folder = await this.folderById(workspaceId, projectKey, folderId);
    const containsItems = await Promise.all([
      this.folders.exists({ workspaceId, projectKey: projectKey.toUpperCase(), parentFolderId: String(folder._id) }),
      this.documents.exists({ workspaceId, projectKey: projectKey.toUpperCase(), folderId: String(folder._id) }),
    ]);
    if (containsItems.some(Boolean)) {
      throw new ConflictException("Only empty document folders can be deleted.");
    }
    await this.folders.deleteOne({ _id: folder._id }).exec();
    const actorMention = await this.resolveActorMention(workspaceId, context.guildId, actorId);
    await this.sendDocLog(
      context.channelId,
      "Folder Deleted",
      `❌ Folder **${folder.name}** was deleted by ${actorMention.mention}.`,
      0xef4444,
      actorMention.mention,
    );
  }

  private async uploadMessage(
    channelId: string,
    file: UploadedDiscordDocumentFile,
    documentName: string,
    version: number,
    mention?: string | null,
    parentMessageId?: string | null,
  ): Promise<DiscordMessage> {
    const data = new FormData();
    const userIds = mention ? (mention.match(/\d{17,21}/g) || []) : [];
    data.append(
      "payload_json",
      JSON.stringify({
        content: mention
          ? `${mention} has uploaded: 📄 ${documentName.slice(0, 160)} · v${version}`
          : `📄 ${documentName.slice(0, 160)} · v${version}`,
        allowed_mentions: userIds.length > 0
          ? { parse: [], users: userIds }
          : { parse: [] },
        ...(parentMessageId
          ? {
              message_reference: {
                message_id: parentMessageId,
                fail_if_not_exists: false,
              },
            }
          : {}),
      }),
    );
    data.append(
      "files[0]",
      new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || "application/octet-stream" }),
      file.originalname,
    );
    return this.botRequest<DiscordMessage>(`/channels/${channelId}/messages`, {
      method: "POST",
      body: data,
    });
  }

  private async storeVersion(
    workspaceId: string,
    projectKey: string,
    actorId: string,
    document: DocumentHydratedDocument,
    file: UploadedDiscordDocumentFile,
  ): Promise<Record<string, unknown>> {
    const context = await this.projectContext(workspaceId, projectKey);
    const previousVersion = document.currentVersion;
    const nextVersion = previousVersion + 1;
    const actorMention = await this.resolveActorMention(workspaceId, context.guildId, actorId);

    let parentMessageId: string | undefined = undefined;
    if (previousVersion > 0) {
      const v1 = await this.versions
        .findOne({
          workspaceId,
          documentId: String(document._id),
          version: 1,
        })
        .exec();
      if (v1) {
        parentMessageId = v1.discordMessageId;
      }
    }
    
    const message = await this.uploadMessage(
      context.channelId,
      file,
      document.name,
      nextVersion,
      actorMention.mention,
      parentMessageId,
    );
    const attachment = message.attachments[0];
    if (!attachment) {
      await this.deleteDiscordMessage(context.channelId, message.id);
      throw new ServiceUnavailableException("Discord did not return an uploaded attachment.");
    }
    let version: DocumentVersionHydratedDocument | null = null;
    try {
      version = await this.versions.create({
        workspaceId,
        projectKey: context.project.key,
        documentId: String(document._id),
        version: nextVersion,
        fileName: attachment.filename,
        mimeType: attachment.content_type ?? file.mimetype ?? "application/octet-stream",
        size: attachment.size,
        discordGuildId: context.guildId,
        discordChannelId: context.channelId,
        discordMessageId: message.id,
        discordAttachmentId: attachment.id,
        uploadedByMemberId: actorId,
      });
      const updated = await this.documents.updateOne(
        { _id: document._id, workspaceId, currentVersion: previousVersion },
        { $set: { updatedByMemberId: actorId }, $inc: { currentVersion: 1 } },
      );
      if (updated.modifiedCount !== 1) {
        throw new ConflictException("Another document version was uploaded at the same time. Retry the upload.");
      }

      if (parentMessageId) {
        await this.discord.sendThreadReply(
          context.channelId,
          parentMessageId,
          {
            title: "New Document Version",
            description: `📄 **${document.name}** (v${nextVersion}) was stored successfully by ${actorMention.mention}.`,
            color: 0x3b82f6,
          },
          actorMention.mention,
        );
      } else {
        await this.sendDocLog(
          context.channelId,
          "Document Uploaded",
          `📄 **${document.name}** (v${nextVersion}) was stored successfully by ${actorMention.mention}.`,
          0x3b82f6,
          actorMention.mention,
        );
      }
      return {
        documentId: String(document._id),
        version: version.version,
        fileName: version.fileName,
        size: version.size,
        openInDiscordUrl: `https://discord.com/channels/${context.guildId}/${context.channelId}/${message.id}`,
      };
    } catch (error) {
      if (version) await this.versions.deleteOne({ _id: version._id }).exec();
      await this.deleteDiscordMessage(context.channelId, message.id);
      throw error;
    }
  }

  async uploadDocument(
    workspaceId: string,
    projectKey: string,
    actorId: string,
    file: UploadedDiscordDocumentFile,
    dto: UploadDocumentDto,
  ): Promise<Record<string, unknown>> {
    const context = await this.projectContext(workspaceId, projectKey);
    const folderId = dto.folderId?.trim() || undefined;
    if (folderId) await this.folderById(workspaceId, context.project.key, folderId);
    const document = await this.documents.create({
      workspaceId,
      projectKey: context.project.key,
      folderId,
      name: dto.name?.trim() || file.originalname,
      description: dto.description?.trim() || "",
      tags: this.normalizedTags(dto.tags),
      currentVersion: 0,
      createdByMemberId: actorId,
      updatedByMemberId: actorId,
    });
    try {
      return await this.storeVersion(workspaceId, context.project.key, actorId, document, file);
    } catch (error) {
      await this.documents.deleteOne({ _id: document._id }).exec();
      throw error;
    }
  }

  async uploadVersion(
    workspaceId: string,
    projectKey: string,
    documentId: string,
    actorId: string,
    file: UploadedDiscordDocumentFile,
  ): Promise<Record<string, unknown>> {
    const document = await this.documentById(workspaceId, projectKey, documentId);
    return this.storeVersion(workspaceId, projectKey, actorId, document, file);
  }

  async updateDocument(
    workspaceId: string,
    projectKey: string,
    documentId: string,
    actorId: string,
    dto: UpdateDocumentDto,
  ): Promise<Record<string, unknown>> {
    const context = await this.projectContext(workspaceId, projectKey);
    const document = await this.documentById(workspaceId, projectKey, documentId);
    if (dto.folderId !== undefined) {
      const folderId = dto.folderId.trim() || undefined;
      if (folderId) await this.folderById(workspaceId, projectKey, folderId);
      document.folderId = folderId;
    }
    if (dto.name !== undefined) document.name = dto.name.trim();
    if (dto.description !== undefined) document.description = dto.description.trim();
    if (dto.tags !== undefined) document.tags = dto.tags.map((tag) => tag.trim()).filter(Boolean);
    document.updatedByMemberId = actorId;
    await document.save();
    const actorMention = await this.resolveActorMention(workspaceId, context.guildId, actorId);

    const v1 = await this.versions
      .findOne({
        workspaceId,
        documentId: String(document._id),
        version: 1,
      })
      .exec();

    if (v1) {
      await this.discord.sendThreadReply(
        context.channelId,
        v1.discordMessageId,
        {
          title: "Document Updated",
          description: `📄 Document **${document.name}** details were updated by ${actorMention.mention}.`,
          color: 0x3b82f6,
        },
        actorMention.mention,
      );
    } else {
      await this.sendDocLog(
        context.channelId,
        "Document Updated",
        `📄 Document **${document.name}** details were updated by ${actorMention.mention}.`,
        0x3b82f6,
        actorMention.mention,
      );
    }
    return { id: String(document._id), name: document.name, folderId: document.folderId ?? null, tags: document.tags };
  }

  async deleteDocument(
    workspaceId: string,
    projectKey: string,
    documentId: string,
    actorId: string,
  ): Promise<void> {
    const context = await this.projectContext(workspaceId, projectKey);
    const document = await this.documentById(workspaceId, projectKey, documentId);
    const versions = await this.versions.find({ workspaceId, documentId: String(document._id) }).exec();
    for (const version of versions) {
      await this.deleteDiscordMessage(version.discordChannelId, version.discordMessageId);
    }
    await this.versions.deleteMany({ workspaceId, documentId: String(document._id) }).exec();
    await this.documents.deleteOne({ _id: document._id }).exec();
    const actorMention = await this.resolveActorMention(workspaceId, context.guildId, actorId);
    await this.sendDocLog(
      context.channelId,
      "Document Deleted",
      `❌ Document **${document.name}** was deleted by ${actorMention.mention}.`,
      0xef4444,
      actorMention.mention,
    );
  }

  async downloadUrl(workspaceId: string, projectKey: string, documentId: string): Promise<string> {
    const document = await this.documentById(workspaceId, projectKey, documentId);
    const version = await this.versions
      .findOne({ workspaceId, documentId: String(document._id), version: document.currentVersion })
      .exec();
    if (!version) throw new NotFoundException("The current document version was not found.");
    const message = await this.botRequest<DiscordMessage>(
      `/channels/${version.discordChannelId}/messages/${version.discordMessageId}`,
    );
    const attachment = message.attachments.find((item) => item.id === version.discordAttachmentId);
    if (!attachment) throw new NotFoundException("The Discord attachment no longer exists.");
    return attachment.url;
  }
}
