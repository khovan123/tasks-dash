import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { BaseMongoDocument } from "../../common/base.schema";

export type ProjectPullRequestHydratedDocument =
  HydratedDocument<ProjectPullRequestDocument>;

@Schema({ collection: "project_pull_requests", timestamps: true })
export class ProjectPullRequestDocument extends BaseMongoDocument {
  @Prop({ required: true, index: true })
  repositoryFullName!: string;

  @Prop({ required: true, index: true })
  number!: number;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  state!: string;

  @Prop({ required: true })
  draft!: boolean;

  @Prop({ required: true })
  headBranch!: string;

  @Prop({ required: true })
  baseBranch!: string;

  @Prop({ required: true, index: true })
  headSha!: string;

  @Prop()
  authorLogin!: string;

  @Prop()
  authorAvatarUrl!: string;

  @Prop({ default: 0 })
  commitsCount!: number;

  @Prop({ default: 0 })
  changedFilesCount!: number;

  @Prop()
  closedAt?: Date;

  @Prop()
  mergedAt?: Date;

  @Prop()
  checkState?: string;
}

export const ProjectPullRequestSchema = SchemaFactory.createForClass(
  ProjectPullRequestDocument,
);

ProjectPullRequestSchema.index(
  { repositoryFullName: 1, number: -1 },
  { unique: true },
);
