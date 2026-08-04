import { Body, Controller, Get, Headers, Injectable, Module, Param, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { InjectModel, MongooseModule, Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Model } from "mongoose";
import { AUTOMATION_ACTIONS, AUTOMATION_EXECUTION_MODES, AUTOMATION_RUN_RESULTS, AutomationAction, AutomationExecutionMode, AutomationRunResult, AutomationTrigger } from "@tasks-dash/contracts";
import { DiscordAdapter, IntegrationsModule } from "../integrations/integrations.module";
import { BaseMongoDocument } from "../../common/base.schema";
@Schema({ _id: false })
export class AutomationActionDocument {
  @Prop({ required: true }) type!: AutomationAction;
  @Prop({ type: Object, default: {} }) config!: Record<string, unknown>;
}
@Schema({ collection: "automation_rules", timestamps: true })
export class AutomationRuleDocument extends BaseMongoDocument {
  @Prop({ required: true }) projectKey!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ default: true }) enabled!: boolean;
  @Prop({ required: true }) trigger!: AutomationTrigger;
  @Prop({ required: true }) executionMode!: AutomationExecutionMode;
  @Prop() cronExpression?: string;
  @Prop({ type: [Object], default: [] }) conditions!: Record<string, unknown>[];
  @Prop({ type: [AutomationActionDocument], default: [] }) actions!: AutomationActionDocument[];
  @Prop({ default: 0 }) runCount!: number;
  @Prop() lastRunAt?: Date;
  @Prop() lastResult?: AutomationRunResult;
  @Prop() lastError?: string;
}
export const AutomationRuleSchema = SchemaFactory.createForClass(AutomationRuleDocument);
type AutomationRuleHydratedDocument = HydratedDocument<AutomationRuleDocument>;
@Injectable()
export class AutomationService {
  constructor(@InjectModel(AutomationRuleDocument.name) private readonly rules: Model<AutomationRuleHydratedDocument>, private readonly discord: DiscordAdapter, private readonly config: ConfigService) {}
  list(workspaceId: string, projectKey: string) { return this.rules.find({ workspaceId, projectKey: projectKey.toUpperCase() }).sort({ createdAt: -1 }).exec(); }
  create(workspaceId: string, projectKey: string, body: Partial<AutomationRuleDocument>) { return this.rules.create({ ...body, workspaceId, projectKey: projectKey.toUpperCase(), executionMode: body.executionMode ?? AUTOMATION_EXECUTION_MODES.event }); }
  async execute(rule: AutomationRuleHydratedDocument) {
    try {
      for (const action of rule.actions) if (action.type === AUTOMATION_ACTIONS.notifyDiscord) await this.discord.send(rule.name, String(action.config.message ?? `Automation executed for ${rule.projectKey}`));
      rule.lastResult = AUTOMATION_RUN_RESULTS.succeeded;
      rule.lastError = undefined;
    } catch (error) {
      rule.lastResult = AUTOMATION_RUN_RESULTS.failed;
      rule.lastError = error instanceof Error ? error.message : "Unknown automation error";
    }
    rule.lastRunAt = new Date(); rule.runCount += 1; await rule.save(); return rule;
  }
  @Cron("0 * * * * *")
  async runScheduledRules(): Promise<void> {
    if (this.config.get<string>("NODE_ENV") === "test") return;
    const rules = await this.rules.find({ enabled: true, executionMode: AUTOMATION_EXECUTION_MODES.scheduled }).limit(25).exec();
    for (const rule of rules) await this.execute(rule);
  }
}
@Controller("projects/:projectKey/automations")
export class AutomationsController {
  constructor(private readonly service: AutomationService) {}
  @Get() list(@Param("projectKey") key: string, @Headers("x-workspace-id") workspaceId = "demo") { return this.service.list(workspaceId, key); }
  @Post() create(@Param("projectKey") key: string, @Body() body: Partial<AutomationRuleDocument>, @Headers("x-workspace-id") workspaceId = "demo") { return this.service.create(workspaceId, key, body); }
}
@Module({ imports: [IntegrationsModule, MongooseModule.forFeature([{ name: AutomationRuleDocument.name, schema: AutomationRuleSchema }])], controllers: [AutomationsController], providers: [AutomationService], exports: [AutomationService, MongooseModule] })
export class AutomationsModule {}
