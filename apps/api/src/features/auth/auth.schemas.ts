import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

/**
 * One record per GitHub account. Workspace membership is stored separately in
 * the members collection so one identity can belong to many workspaces.
 */
@Schema({ collection: "auth_identities", timestamps: true })
export class AuthIdentityDocument {
  @Prop({ required: true, unique: true, index: true }) githubId!: number;
  @Prop({ required: true }) login!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true, lowercase: true, trim: true, index: true }) email!: string;
  @Prop({ default: "" }) avatarUrl!: string;
  @Prop() lastWorkspaceId?: string;
  @Prop({ required: true }) encryptedGithubAccessToken!: string;
  @Prop() encryptedGithubRefreshToken?: string;
  @Prop() githubAccessTokenExpiresAt?: Date;
  @Prop() githubRefreshTokenExpiresAt?: Date;
  @Prop() lastLoginAt?: Date;
}

export const AuthIdentitySchema = SchemaFactory.createForClass(
  AuthIdentityDocument,
);
export type AuthIdentityHydratedDocument =
  HydratedDocument<AuthIdentityDocument>;
