import { Body, Controller, Get, Injectable, Module, Param, Post } from "@nestjs/common";
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Model } from "mongoose";
import { MemberRole, MEMBER_PRESENCE, MEMBER_ROLES } from "@tasks-dash/contracts";
import { RequireRoles, WorkspaceId } from "../../common/auth-context";
import { BaseMongoDocument } from "../../common/base.schema";
@Schema({ collection: "members", timestamps: true })
export class MemberDocument extends BaseMongoDocument {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) email!: string;
  @Prop({ default: "" }) avatarUrl!: string;
  @Prop({ required: true }) role!: MemberRole;
  @Prop({ type: [String], default: [] }) projectKeys!: string[];
  @Prop({ default: MEMBER_PRESENCE.online }) status!: string;
}
export const MemberSchema = SchemaFactory.createForClass(MemberDocument);
MemberSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
type MemberHydratedDocument = HydratedDocument<MemberDocument>;
@Injectable()
export class MembersService {
  constructor(@InjectModel(MemberDocument.name) private readonly members: Model<MemberHydratedDocument>) {}
  list(workspaceId: string, projectKey?: string) { return this.members.find(projectKey ? { workspaceId, projectKeys: projectKey.toUpperCase() } : { workspaceId }).sort({ name: 1 }).exec(); }
  create(workspaceId: string, input: Partial<MemberDocument>) { return this.members.create({ ...input, workspaceId, email: input.email?.toLowerCase(), role: input.role ?? MEMBER_ROLES.member }); }
}
@Controller("members")
export class MembersController {
  constructor(private readonly service: MembersService) {}
  @Get() list(@WorkspaceId() workspaceId: string) { return this.service.list(workspaceId); }
  @Get("project/:projectKey") byProject(@Param("projectKey") projectKey: string, @WorkspaceId() workspaceId: string) { return this.service.list(workspaceId, projectKey); }
  @Post()
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin)
  create(@Body() body: Partial<MemberDocument>, @WorkspaceId() workspaceId: string) { return this.service.create(workspaceId, body); }
}
@Module({ imports: [MongooseModule.forFeature([{ name: MemberDocument.name, schema: MemberSchema }])], controllers: [MembersController], providers: [MembersService], exports: [MembersService, MongooseModule] })
export class MembersModule {}
