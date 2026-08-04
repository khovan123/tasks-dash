import { Body, Controller, Get, Injectable, Module, Param, Post } from "@nestjs/common";
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Model } from "mongoose";
import { MEMBER_ROLES, SPRINT_STATES, SprintState } from "@tasks-dash/contracts";
import { RequireRoles, WorkspaceId } from "../../common/auth-context";
import { BaseMongoDocument } from "../../common/base.schema";
@Schema({ collection: "sprints", timestamps: true })
export class SprintDocument extends BaseMongoDocument {
  @Prop({ required: true }) projectKey!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ default: "" }) goal!: string;
  @Prop({ required: true }) state!: SprintState;
  @Prop() startDate?: Date;
  @Prop() endDate?: Date;
  @Prop({ default: 0 }) capacity!: number;
}
export const SprintSchema = SchemaFactory.createForClass(SprintDocument);
type SprintHydratedDocument = HydratedDocument<SprintDocument>;
@Injectable()
export class SprintsService {
  constructor(@InjectModel(SprintDocument.name) private readonly sprints: Model<SprintHydratedDocument>) {}
  list(workspaceId: string, projectKey: string) { return this.sprints.find({ workspaceId, projectKey: projectKey.toUpperCase() }).sort({ createdAt: -1 }).exec(); }
  create(workspaceId: string, projectKey: string, body: Partial<SprintDocument>) { return this.sprints.create({ ...body, workspaceId, projectKey: projectKey.toUpperCase(), state: body.state ?? SPRINT_STATES.planned }); }
}
@Controller("projects/:projectKey/sprints")
export class SprintsController {
  constructor(private readonly service: SprintsService) {}
  @Get() list(@Param("projectKey") key: string, @WorkspaceId() workspaceId: string) { return this.service.list(workspaceId, key); }
  @Post()
  @RequireRoles(MEMBER_ROLES.owner, MEMBER_ROLES.admin, MEMBER_ROLES.projectLead)
  create(@Param("projectKey") key: string, @Body() body: Partial<SprintDocument>, @WorkspaceId() workspaceId: string) { return this.service.create(workspaceId, key, body); }
}
@Module({ imports: [MongooseModule.forFeature([{ name: SprintDocument.name, schema: SprintSchema }])], controllers: [SprintsController], providers: [SprintsService], exports: [SprintsService, MongooseModule] })
export class SprintsModule {}
