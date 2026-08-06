import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  AuthSession,
  CurrentSession,
  RequireProjectAccess,
  RequireRoles,
  WorkspaceId,
} from "../../common/auth-context";
import {
  CreateDocumentFolderDto,
  RenameDocumentFolderDto,
  UpdateDocumentDto,
  UploadDocumentDto,
} from "./documents.dto";
import {
  DISCORD_DOCUMENT_MAX_FILE_SIZE,
  DocumentsService,
  UploadedDiscordDocumentFile,
} from "./documents.service";

const DOCUMENT_EDITOR_ROLES = [
  MEMBER_ROLES.owner,
  MEMBER_ROLES.ba,
] as const;

@Controller("projects/:projectKey/documents")
@RequireProjectAccess()
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  list(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
  ): Promise<Record<string, unknown>> {
    return this.service.list(workspaceId, projectKey);
  }

  @Post("folders")
  @RequireRoles(...DOCUMENT_EDITOR_ROLES)
  createFolder(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @CurrentSession() session: AuthSession,
    @Body() body: CreateDocumentFolderDto,
  ): Promise<Record<string, unknown>> {
    return this.service.createFolder(workspaceId, projectKey, session.memberId, body);
  }

  @Patch("folders/:folderId")
  @RequireRoles(...DOCUMENT_EDITOR_ROLES)
  renameFolder(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Param("folderId") folderId: string,
    @Body() body: RenameDocumentFolderDto,
  ): Promise<Record<string, unknown>> {
    return this.service.renameFolder(workspaceId, projectKey, folderId, body);
  }

  @Delete("folders/:folderId")
  @RequireRoles(...DOCUMENT_EDITOR_ROLES)
  async deleteFolder(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Param("folderId") folderId: string,
  ): Promise<void> {
    await this.service.deleteFolder(workspaceId, projectKey, folderId);
  }

  @Post("upload")
  @RequireRoles(...DOCUMENT_EDITOR_ROLES)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { files: 1, fileSize: DISCORD_DOCUMENT_MAX_FILE_SIZE },
    }),
  )
  uploadDocument(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @CurrentSession() session: AuthSession,
    @UploadedFile() file: UploadedDiscordDocumentFile | undefined,
    @Body() body: UploadDocumentDto,
  ): Promise<Record<string, unknown>> {
    if (!file) throw new BadRequestException("File is required.");
    return this.service.uploadDocument(workspaceId, projectKey, session.memberId, file, body);
  }

  @Post(":documentId/versions")
  @RequireRoles(...DOCUMENT_EDITOR_ROLES)
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { files: 1, fileSize: DISCORD_DOCUMENT_MAX_FILE_SIZE },
    }),
  )
  uploadVersion(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Param("documentId") documentId: string,
    @CurrentSession() session: AuthSession,
    @UploadedFile() file: UploadedDiscordDocumentFile | undefined,
  ): Promise<Record<string, unknown>> {
    if (!file) throw new BadRequestException("File is required.");
    return this.service.uploadVersion(workspaceId, projectKey, documentId, session.memberId, file);
  }

  @Patch(":documentId")
  @RequireRoles(...DOCUMENT_EDITOR_ROLES)
  updateDocument(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Param("documentId") documentId: string,
    @CurrentSession() session: AuthSession,
    @Body() body: UpdateDocumentDto,
  ): Promise<Record<string, unknown>> {
    return this.service.updateDocument(workspaceId, projectKey, documentId, session.memberId, body);
  }

  @Delete(":documentId")
  @RequireRoles(...DOCUMENT_EDITOR_ROLES)
  async deleteDocument(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Param("documentId") documentId: string,
  ): Promise<void> {
    await this.service.deleteDocument(workspaceId, projectKey, documentId);
  }

  @Get(":documentId/download")
  async download(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Param("documentId") documentId: string,
    @Res() response: Response,
  ): Promise<void> {
    const url = await this.service.downloadUrl(workspaceId, projectKey, documentId);
    response.redirect(302, url);
  }
}
