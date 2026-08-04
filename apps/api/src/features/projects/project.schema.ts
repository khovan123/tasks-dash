import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { BaseMongoDocument } from "../../common/base.schema";
@Schema({ collection: "projects", timestamps: true })
export class ProjectDocument extends BaseMongoDocument {
  @Prop({ required: true, uppercase: true, trim: true }) key!: string;
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ default: "" }) description!: string;
  @Prop({ default: "#4f46e5" }) color!: string;
  @Prop({ default: "Layers3" }) icon!: string;
  @Prop() leadId?: string;
  @Prop({ type: [String], default: [] }) memberIds!: string[];
  @Prop() repositoryFullName?: string;
  @Prop() driveRootFolderId?: string;
  @Prop() workflowId?: string;
  @Prop() activeSprintId?: string;
  @Prop({ default: 0 }) sequence!: number;
}
export type ProjectHydratedDocument = HydratedDocument<ProjectDocument>;
export const ProjectSchema = SchemaFactory.createForClass(ProjectDocument);
ProjectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
