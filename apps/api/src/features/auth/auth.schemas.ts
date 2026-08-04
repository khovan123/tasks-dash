import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

@Schema({ collection: "auth_users", timestamps: true })
export class AuthUserDocument {
  @Prop({ required: true, unique: true, index: true }) githubId!: number;
  @Prop({ required: true }) login!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) email!: string;
  @Prop({ default: "" }) avatarUrl!: string;
  @Prop({ required: true, index: true }) workspaceId!: string;
  @Prop({ required: true, unique: true, index: true }) memberId!: string;
  @Prop({ required: true }) encryptedGithubAccessToken!: string;
  @Prop() encryptedGithubRefreshToken?: string;
  @Prop() githubAccessTokenExpiresAt?: Date;
  @Prop() githubRefreshTokenExpiresAt?: Date;
  @Prop() lastLoginAt?: Date;
}

export const AuthUserSchema = SchemaFactory.createForClass(AuthUserDocument);
export type AuthUserHydratedDocument = HydratedDocument<AuthUserDocument>;
