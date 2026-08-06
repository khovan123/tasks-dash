import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import {
  MemberInvitationStatus,
  MemberRole,
  MEMBER_INVITATION_STATUSES,
} from "@tasks-dash/contracts";
import { BaseMongoDocument } from "../../common/base.schema";

@Schema({ collection: "workspace_invitations", timestamps: true })
export class WorkspaceInvitationDocument extends BaseMongoDocument {
  @Prop({ required: true, lowercase: true, trim: true, index: true }) email!: string;
  @Prop({ required: true }) role!: MemberRole;
  @Prop({ required: true, unique: true, index: true }) tokenHash!: string;
  @Prop({ required: true, default: MEMBER_INVITATION_STATUSES.pending }) status!: MemberInvitationStatus;
  @Prop({ required: true, index: true }) expiresAt!: Date;
  @Prop({ type: [String], default: [] }) projectIds?: string[];
  @Prop({ default: false }) allProjects?: boolean;
  @Prop() invitedByMemberId?: string;
  @Prop() acceptedByMemberId?: string;
  @Prop() acceptedAt?: Date;
  @Prop() revokedAt?: Date;
  @Prop() lastSentAt?: Date;
}

export const WorkspaceInvitationSchema = SchemaFactory.createForClass(
  WorkspaceInvitationDocument,
);
WorkspaceInvitationSchema.index({ workspaceId: 1, email: 1, status: 1 });
export type WorkspaceInvitationHydratedDocument =
  HydratedDocument<WorkspaceInvitationDocument>;
