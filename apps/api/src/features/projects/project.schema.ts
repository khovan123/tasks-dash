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
  @Prop({ trim: true }) repositoryFullName?: string;
  @Prop({ trim: true }) discordGuildId?: string;
  @Prop({ trim: true }) discordUpdatesChannelId?: string;
  @Prop({ trim: true }) discordUpdatesChannelName?: string;
  @Prop({ trim: true }) discordDocsChannelId?: string;
  @Prop({ trim: true }) discordDocsChannelName?: string;
  @Prop() discordProvisionedAt?: Date;
  @Prop() workflowId?: string;
  @Prop() activeSprintId?: string;
  @Prop({ default: 0 }) sequence!: number;
  @Prop({ type: [String], default: [] }) memberIds!: string[];
  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  memberRoles!: Map<string, string>;

  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  environmentVariables!: Map<string, string>;
}

export type ProjectHydratedDocument = HydratedDocument<ProjectDocument>;
export const ProjectSchema = SchemaFactory.createForClass(ProjectDocument);
ProjectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
ProjectSchema.index(
  { workspaceId: 1, repositoryFullName: 1 },
  {
    unique: true,
    partialFilterExpression: { repositoryFullName: { $type: "string" } },
  },
);
ProjectSchema.index(
  { workspaceId: 1, discordDocsChannelId: 1 },
  {
    unique: true,
    partialFilterExpression: { discordDocsChannelId: { $type: "string" } },
  },
);
