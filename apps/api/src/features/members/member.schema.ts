import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { MemberRole, MEMBER_PRESENCE } from "@tasks-dash/contracts";
import { BaseMongoDocument } from "../../common/base.schema";

@Schema({ collection: "members", timestamps: true })
export class MemberDocument extends BaseMongoDocument {
  @Prop({ required: true, trim: true }) name!: string;
  @Prop({ required: true, lowercase: true, trim: true }) email!: string;
  @Prop({ default: "" }) avatarUrl!: string;
  @Prop({ required: true }) role!: MemberRole;
  @Prop({ default: MEMBER_PRESENCE.offline }) status!: string;
  @Prop() lastLoginAt?: Date;
}

export const MemberSchema = SchemaFactory.createForClass(MemberDocument);
MemberSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
export type MemberHydratedDocument = HydratedDocument<MemberDocument>;
