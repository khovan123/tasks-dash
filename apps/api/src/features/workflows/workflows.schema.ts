import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { WorkflowCategory } from "@tasks-dash/contracts";
import { BaseMongoDocument } from "../../common/base.schema";
@Schema({ _id: false })
export class WorkflowStatusDocument {
  @Prop({ required: true }) id!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) category!: WorkflowCategory;
  @Prop({ default: "#64748b" }) color!: string;
  @Prop({ required: true }) order!: number;
}
@Schema({ _id: false })
export class WorkflowTransitionDocument {
  @Prop({ required: true }) id!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) fromStatusId!: string;
  @Prop({ required: true }) toStatusId!: string;
  @Prop({ type: [String], default: [] }) allowedRoleIds!: string[];
}
@Schema({ collection: "workflows", timestamps: true })
export class WorkflowDocument extends BaseMongoDocument {
  @Prop({ required: true }) projectKey!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) defaultStatusId!: string;
  @Prop({ type: [WorkflowStatusDocument], default: [] }) statuses!: WorkflowStatusDocument[];
  @Prop({ type: [WorkflowTransitionDocument], default: [] }) transitions!: WorkflowTransitionDocument[];
}
export type WorkflowHydratedDocument = HydratedDocument<WorkflowDocument>;
export const WorkflowSchema = SchemaFactory.createForClass(WorkflowDocument);
WorkflowSchema.index({ workspaceId: 1, projectKey: 1 }, { unique: true });
