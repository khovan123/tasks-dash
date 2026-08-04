import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

@Schema({ collection: "workspaces", timestamps: true })
export class WorkspaceDocument {
  @Prop({ required: true, unique: true, index: true }) workspaceId!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true }) slug!: string;
  @Prop({ required: true, lowercase: true, trim: true }) createdByEmail!: string;
}

export const WorkspaceSchema = SchemaFactory.createForClass(WorkspaceDocument);
export type WorkspaceHydratedDocument = HydratedDocument<WorkspaceDocument>;
