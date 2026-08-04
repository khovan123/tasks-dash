import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import {
  GithubPullRequestState,
  Priority,
  WorkItemType,
} from "@tasks-dash/contracts";
import { BaseMongoDocument } from "../../common/base.schema";

@Schema({ _id: false })
export class GithubLinkDocument {
  @Prop() branch?: string;
  @Prop({ type: [String], default: [] }) commitShas!: string[];
  @Prop() pullRequestNumber?: number;
  @Prop() pullRequestUrl?: string;
  @Prop() pullRequestState?: GithubPullRequestState;
}

@Schema({ _id: false })
export class ExternalLinkDocument {
  @Prop({ default: "" }) label!: string;
  @Prop({ required: true }) url!: string;
}

@Schema({ collection: "work_items", timestamps: true })
export class WorkItemDocument extends BaseMongoDocument {
  @Prop({ required: true, index: true }) projectKey!: string;
  @Prop({ required: true, unique: true }) key!: string;
  @Prop({ required: true }) sequence!: number;
  @Prop({ required: true, index: true, default: 0 }) rank!: number;
  @Prop({ required: true }) type!: WorkItemType;
  @Prop({ required: true }) summary!: string;
  @Prop({ default: "" }) description!: string;
  @Prop({ required: true, index: true }) statusId!: string;
  @Prop({ required: true }) priority!: Priority;
  @Prop() assigneeId?: string;
  @Prop({ required: true }) reporterId!: string;
  @Prop() moduleId?: string;
  @Prop() parentId?: string;
  @Prop() sprintId?: string;
  @Prop({ type: [String], default: [] }) labels!: string[];
  @Prop() storyPoints?: number;
  @Prop() dueDate?: Date;
  @Prop() startedAt?: Date;
  @Prop() completedAt?: Date;
  @Prop({ type: [ExternalLinkDocument], default: [] })
  figmaLinks!: ExternalLinkDocument[];
  @Prop({ type: [ExternalLinkDocument], default: [] })
  documentLinks!: ExternalLinkDocument[];
  @Prop({ type: GithubLinkDocument }) github?: GithubLinkDocument;
}

export type WorkItemHydratedDocument = HydratedDocument<WorkItemDocument>;
export const WorkItemSchema = SchemaFactory.createForClass(WorkItemDocument);
WorkItemSchema.index(
  { workspaceId: 1, projectKey: 1, sequence: 1 },
  { unique: true },
);
WorkItemSchema.index({ workspaceId: 1, projectKey: 1, rank: 1 });
