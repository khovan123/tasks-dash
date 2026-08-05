import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { BaseMongoDocument } from "../../common/base.schema";

@Schema({ collection: "document_folders", timestamps: true })
export class DocumentFolderDocument extends BaseMongoDocument {
  @Prop({ required: true, uppercase: true, trim: true }) projectKey!: string;
  @Prop({ trim: true }) parentFolderId?: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ required: true }) createdByMemberId!: string;
}
export const DocumentFolderSchema = SchemaFactory.createForClass(DocumentFolderDocument);
DocumentFolderSchema.index(
  { workspaceId: 1, projectKey: 1, parentFolderId: 1, name: 1 },
  { unique: true },
);

@Schema({ collection: "documents", timestamps: true })
export class DocumentDocument extends BaseMongoDocument {
  @Prop({ required: true, uppercase: true, trim: true }) projectKey!: string;
  @Prop({ trim: true }) folderId?: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ default: "" }) description!: string;
  @Prop({ type: [String], default: [] }) tags!: string[];
  @Prop({ default: 0 }) currentVersion!: number;
  @Prop({ required: true }) createdByMemberId!: string;
  @Prop({ required: true }) updatedByMemberId!: string;
}
export const DocumentSchema = SchemaFactory.createForClass(DocumentDocument);
DocumentSchema.index({ workspaceId: 1, projectKey: 1, folderId: 1, name: 1 });

@Schema({ collection: "document_versions", timestamps: true })
export class DocumentVersionDocument extends BaseMongoDocument {
  @Prop({ required: true, uppercase: true, trim: true }) projectKey!: string;
  @Prop({ required: true, index: true }) documentId!: string;
  @Prop({ required: true, min: 1 }) version!: number;
  @Prop({ required: true }) fileName!: string;
  @Prop({ required: true }) mimeType!: string;
  @Prop({ required: true, min: 0 }) size!: number;
  @Prop({ required: true }) discordGuildId!: string;
  @Prop({ required: true }) discordChannelId!: string;
  @Prop({ required: true }) discordMessageId!: string;
  @Prop({ required: true }) discordAttachmentId!: string;
  @Prop({ required: true }) uploadedByMemberId!: string;
}
export const DocumentVersionSchema = SchemaFactory.createForClass(DocumentVersionDocument);
DocumentVersionSchema.index({ workspaceId: 1, documentId: 1, version: 1 }, { unique: true });
DocumentVersionSchema.index(
  { workspaceId: 1, discordChannelId: 1, discordMessageId: 1 },
  { unique: true },
);

export type DocumentFolderHydratedDocument = HydratedDocument<DocumentFolderDocument>;
export type DocumentHydratedDocument = HydratedDocument<DocumentDocument>;
export type DocumentVersionHydratedDocument = HydratedDocument<DocumentVersionDocument>;
