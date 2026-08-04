import { Body, Controller, Get, Headers, Injectable, Module, Param, Post } from "@nestjs/common";
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Model } from "mongoose";
import { MemberRole, MEMBER_PRESENCE, MEMBER_ROLES } from "@tasks-dash/contracts";
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
type MemberHydratedDocument = HydratedDocument<MemberDocument>;
@Injectable()
export class MembersService {
  constructor(@InjectModel(MemberDocument.name) private readonly members: Model<MemberHydratedDocument>) {}
  list(workspaceId: string, projectKey?: string) { return this.members.find(projectKey ? { workspaceId, projectKeys: projectKey.toUpperCase() } : { workspaceId }).sort({ name: 1 }).exec(); }
  create(workspaceId: string, input: Partial<MemberDocument>) { return this.members.create({ workspaceId, role: MEMBER_ROLES.member, ...input }); }
}
@Controller("members")
export class MembersController {
  constructor(private readonly service: MembersService) {}
  @Get() list(@Headers("x-workspace-id") workspaceId = "demo") { return this.service.list(workspaceId); }
  @Get("project/:projectKey") byProject(@Param("projectKey") projectKey: string, @Headers("x-workspace-id") workspaceId = "demo") { return this.service.list(workspaceId, projectKey); }
  @Post() create(@Body() body: Partial<MemberDocument>, @Headers("x-workspace-id") workspaceId = "demo") { return this.service.create(workspaceId, body); }
}
@Module({ imports: [MongooseModule.forFeature([{ name: MemberDocument.name, schema: MemberSchema }])], controllers: [MembersController], providers: [MembersService], exports: [MembersService, MongooseModule] })
export class MembersModule {}
