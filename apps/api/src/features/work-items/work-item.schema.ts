import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import {
  GithubLinkSource,
  GithubPullRequestState,
  GithubPullRequestStatus,
  GithubReviewState,
  Priority,
  WorkItemType,
} from "@tasks-dash/contracts";
import { BaseMongoDocument } from "../../common/base.schema";

@Schema({ _id: false })
export class GithubCommitLinkDocument {
  @Prop({ required: true }) sha!: string;
  @Prop({ default: "" }) message!: string;
  @Prop() url?: string;
  @Prop() branch?: string;
  @Prop() committedAt?: Date;
  @Prop({ type: [String], default: [] }) sources!: GithubLinkSource[];
}

@Schema({ _id: false })
export class GithubPullRequestLinkDocument {
  @Prop({ required: true }) number!: number;
  @Prop({ required: true }) title!: string;
  @Prop({ required: true }) url!: string;
  @Prop({ required: true }) state!: GithubPullRequestState;
  @Prop({ required: true }) status!: GithubPullRequestStatus;
  @Prop({ default: false }) draft!: boolean;
  @Prop({ default: "" }) headBranch!: string;
  @Prop({ default: "" }) baseBranch!: string;
  @Prop({ default: "" }) headSha!: string;
  @Prop({ default: "" }) action!: string;
  @Prop() reviewState?: GithubReviewState;
  @Prop() authorLogin?: string;
  @Prop() updatedAt?: Date;
  @Prop() closedAt?: Date;
  @Prop() mergedAt?: Date;
  @Prop({ type: [String], default: [] }) sources!: GithubLinkSource[];
}

@Schema({ _id: false })
export class GithubLinkDocument {
  @Prop({ type: [String], default: [] }) branches!: string[];
  @Prop({ type: [GithubCommitLinkDocument], default: [] })
  commits!: GithubCommitLinkDocument[];
  @Prop({ type: [GithubPullRequestLinkDocument], default: [] })
  pullRequests!: GithubPullRequestLinkDocument[];

  // Legacy fields are retained so existing MongoDB records remain readable.
  @Prop() branch?: string;
  @Prop({ type: [String], default: [] }) commitShas?: string[];
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
