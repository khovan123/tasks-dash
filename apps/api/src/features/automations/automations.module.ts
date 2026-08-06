import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { randomUUID } from "node:crypto";
import { Cron } from "@nestjs/schedule";
import {
  InjectModel,
  MongooseModule,
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";
import { HydratedDocument, isValidObjectId, Model, Types } from "mongoose";
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_EXECUTION_MODES,
  AUTOMATION_RUN_RESULTS,
  AUTOMATION_TRIGGERS,
  AutomationAction,
  AutomationExecutionMode,
  AutomationRunResult,
  AutomationTrigger,
  MEMBER_ROLES,
} from "@tasks-dash/contracts";
import { WorkspaceId, RequireProjectAccess, RequireRoles } from "../../common/auth-context";
import { BaseMongoDocument } from "../../common/base.schema";
import { DiscordAdapter } from "../integrations/discord.adapter";
import { GithubAppService } from "../integrations/github-app.service";
import { AUTOMATION_GITHUB_PULL_REQUEST_EVENT } from "../integrations/github-webhook.service";
import { IntegrationsModule } from "../integrations/integrations.module";
import { WorkItemsModule } from "../work-items/work-items.module";
import { WorkItemsService } from "../work-items/work-items.service";

@Schema({ _id: false })
export class AutomationActionDocument {
  @Prop({ required: true }) type!: AutomationAction;
  @Prop({ type: Object, default: {} }) config!: Record<string, unknown>;
}

@Schema({ collection: "automation_rules", timestamps: true })
export class AutomationRuleDocument extends BaseMongoDocument {
  @Prop({ required: true, uppercase: true }) projectKey!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ default: true }) enabled!: boolean;
  @Prop({ required: true }) trigger!: AutomationTrigger;
  @Prop({ required: true }) executionMode!: AutomationExecutionMode;
  @Prop() cronExpression?: string;
  @Prop({ type: [Object], default: [] }) conditions!: Record<string, unknown>[];
  @Prop({ type: [AutomationActionDocument], default: [] })
  actions!: AutomationActionDocument[];
  @Prop({ default: 0 }) runCount!: number;
  @Prop() lastRunAt?: Date;
  @Prop() lastScheduledMinute?: string;
  @Prop() lockUntil?: Date;
  @Prop() lastResult?: AutomationRunResult;
  @Prop() lastError?: string;
}
export const AutomationRuleSchema = SchemaFactory.createForClass(
  AutomationRuleDocument,
);
type AutomationRuleHydratedDocument = HydratedDocument<AutomationRuleDocument>;

@Schema({ collection: "automation_runs", timestamps: true })
export class AutomationRunDocument extends BaseMongoDocument {
  @Prop({ required: true, index: true }) ruleId!: string;
  @Prop({ required: true }) projectKey!: string;
  @Prop({ required: true }) sourceEventId!: string;
  @Prop({ required: true }) result!: AutomationRunResult;
  @Prop({ type: Object, default: {} }) context!: Record<string, unknown>;
  @Prop() error?: string;
  @Prop({ required: true }) startedAt!: Date;
  @Prop({ required: true }) completedAt!: Date;
}
export const AutomationRunSchema = SchemaFactory.createForClass(
  AutomationRunDocument,
);
AutomationRunSchema.index({
  workspaceId: 1,
  ruleId: 1,
  sourceEventId: 1,
  result: 1,
});
type AutomationRunHydratedDocument = HydratedDocument<AutomationRunDocument>;

interface AutomationContext {
  sourceEventId: string;
  workspaceId: string;
  projectKey: string;
  trigger: AutomationTrigger;
  workItemKey?: string | null;
  repositoryFullName?: string;
  pullRequestNumber?: number | null;
  pullRequestUrl?: string | null;
  title?: string;
  action?: string;
  scheduledAt?: string;
}

function fieldValues(token: string, min: number, max: number): Set<number> {
  const values = new Set<number>();
  for (const part of token.split(",")) {
    const [rangeToken, stepToken] = part.split("/");
    const step = stepToken ? Number(stepToken) : 1;
    if (!Number.isInteger(step) || step <= 0)
      throw new Error(`Invalid cron step: ${part}`);
    let start = min;
    let end = max;
    if (rangeToken !== "*") {
      if (rangeToken.includes("-")) {
        const [startToken, endToken] = rangeToken.split("-");
        start = Number(startToken);
        end = Number(endToken);
      } else {
        start = Number(rangeToken);
        end = start;
      }
    }
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < min ||
      end > max ||
      start > end
    ) {
      throw new Error(`Invalid cron field: ${part}`);
    }
    for (let value = start; value <= end; value += step) values.add(value);
  }
  return values;
}

function cronMatches(expression: string, date: Date): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5)
    throw new Error("Scheduled automation cron must contain five fields.");
  const [minute, hour, day, month, weekday] = fields;
  return (
    fieldValues(minute, 0, 59).has(date.getUTCMinutes()) &&
    fieldValues(hour, 0, 23).has(date.getUTCHours()) &&
    fieldValues(day, 1, 31).has(date.getUTCDate()) &&
    fieldValues(month, 1, 12).has(date.getUTCMonth() + 1) &&
    fieldValues(weekday, 0, 6).has(date.getUTCDay())
  );
}

function minuteKey(date: Date): string {
  return date.toISOString().slice(0, 16);
}

function stringConfig(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== "string" || !value.trim())
    throw new Error(`Automation action requires config.${key}.`);
  return value.trim();
}

function renderTemplate(template: string, context: AutomationContext): string {
  return template.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_match, key: string) => {
    const value = context[key as keyof AutomationContext];
    return value === null || value === undefined ? "" : String(value);
  });
}

@Injectable()
export class AutomationService {
  constructor(
    @InjectModel(AutomationRuleDocument.name)
    private readonly rules: Model<AutomationRuleHydratedDocument>,
    @InjectModel(AutomationRunDocument.name)
    private readonly runs: Model<AutomationRunHydratedDocument>,
    private readonly discord: DiscordAdapter,
    private readonly github: GithubAppService,
    private readonly workItems: WorkItemsService,
  ) {}

  async list(
    workspaceId: string,
    projectKey: string,
  ): Promise<AutomationRuleHydratedDocument[]> {
    await this.ensureDefaults(workspaceId, projectKey.toUpperCase());
    return this.rules
      .find({ workspaceId, projectKey: projectKey.toUpperCase() })
      .sort({ createdAt: -1 })
      .exec();
  }

  async toggle(
    workspaceId: string,
    projectKey: string,
    ruleId: string,
    enabled?: boolean,
  ): Promise<AutomationRuleHydratedDocument> {
    if (!isValidObjectId(ruleId))
      throw new BadRequestException("Invalid automation rule id.");
    const rule = await this.rules
      .findOne({
        _id: new Types.ObjectId(ruleId),
        workspaceId,
        projectKey: projectKey.toUpperCase(),
      })
      .exec();
    if (!rule) throw new NotFoundException("Automation rule was not found.");
    rule.enabled = typeof enabled === "boolean" ? enabled : !rule.enabled;
    return rule.save();
  }

  async delete(
    workspaceId: string,
    projectKey: string,
    ruleId: string,
  ): Promise<{ ok: boolean }> {
    if (!isValidObjectId(ruleId))
      throw new BadRequestException("Invalid automation rule id.");
    const res = await this.rules
      .deleteOne({
        _id: new Types.ObjectId(ruleId),
        workspaceId,
        projectKey: projectKey.toUpperCase(),
      })
      .exec();
    if (res.deletedCount === 0)
      throw new NotFoundException("Automation rule was not found.");
    return { ok: true };
  }

  private async ensureDefaults(
    workspaceId: string,
    projectKey: string,
  ): Promise<void> {
    const defaultRules = [
      {
        name: "Discord · Pull request opened",
        trigger: AUTOMATION_TRIGGERS.pullRequestOpened,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "PR #{{pullRequestNumber}} opened · {{workItemKey}}",
              message: "{{repositoryFullName}}\n{{title}}\n{{pullRequestUrl}}",
            },
          },
        ],
      },
      {
        name: "Discord · Pull request merged",
        trigger: AUTOMATION_TRIGGERS.pullRequestMerged,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "PR #{{pullRequestNumber}} merged · {{workItemKey}}",
              message: "{{repositoryFullName}}\n{{title}}\n{{pullRequestUrl}}",
            },
          },
        ],
      },
      {
        name: "Discord · Pull request review comment",
        trigger: AUTOMATION_TRIGGERS.pullRequestReviewCommented,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "PR Review Comment · {{workItemKey}}",
              message: "New review comment on PR #{{pullRequestNumber}}",
            },
          },
        ],
      },
      {
        name: "Discord · Pull request approved",
        trigger: AUTOMATION_TRIGGERS.pullRequestApproved,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "PR #{{pullRequestNumber}} Approved · {{workItemKey}}",
              message: "Pull request approved and ready to merge",
            },
          },
        ],
      },
      {
        name: "Discord · CI/CD build status",
        trigger: AUTOMATION_TRIGGERS.ciCdDeploymentSuccess,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "CI/CD Deployment · {{projectKey}}",
              message: "Deployment status log ref link",
            },
          },
        ],
      },
      {
        name: "Discord · Work item created",
        trigger: AUTOMATION_TRIGGERS.workItemCreated,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "Task created · {{workItemKey}}",
              message: "{{title}}",
            },
          },
        ],
      },
      {
        name: "Discord · Work item completed",
        trigger: AUTOMATION_TRIGGERS.workItemTransitioned,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "Task completed · {{workItemKey}}",
              message: "{{title}} moved to DONE",
            },
          },
        ],
      },
      {
        name: "Discord · Member joined",
        trigger: AUTOMATION_TRIGGERS.memberAdded,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "Member update · {{projectKey}}",
              message: "Project members list synchronized",
            },
          },
        ],
      },
      {
        name: "Discord · Document created",
        trigger: AUTOMATION_TRIGGERS.documentCreated,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "Document update · {{projectKey}}",
              message: "Document channel updated",
            },
          },
        ],
      },
      {
        name: "Discord · Design catalog updated",
        trigger: AUTOMATION_TRIGGERS.designCatalogUpdated,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        actions: [
          {
            type: AUTOMATION_ACTIONS.notifyDiscord,
            config: {
              title: "Design catalog update · {{projectKey}}",
              message: "Figma design link logged",
            },
          },
        ],
      },
    ];

    for (const rule of defaultRules) {
      await this.rules.updateOne(
        { workspaceId, projectKey, name: rule.name },
        {
          $setOnInsert: {
            workspaceId,
            projectKey,
            name: rule.name,
            enabled: true,
            trigger: rule.trigger,
            executionMode: rule.executionMode,
            conditions: [],
            actions: rule.actions,
            runCount: 0,
          },
        },
        { upsert: true },
      );
    }
  }

  create(
    workspaceId: string,
    projectKey: string,
    body: Partial<AutomationRuleDocument>,
  ): Promise<AutomationRuleHydratedDocument> {
    const executionMode =
      body.executionMode ?? AUTOMATION_EXECUTION_MODES.event;
    if (executionMode === AUTOMATION_EXECUTION_MODES.scheduled) {
      if (!body.cronExpression)
        throw new BadRequestException(
          "cronExpression is required for scheduled automation.",
        );
      cronMatches(body.cronExpression, new Date());
    }
    if (!body.actions?.length)
      throw new BadRequestException(
        "At least one automation action is required.",
      );
    return this.rules.create({
      ...body,
      workspaceId,
      projectKey: projectKey.toUpperCase(),
      executionMode,
    });
  }

  @OnEvent("automation.*", { async: true })
  async onAutomationEvent(context: AutomationContext): Promise<void> {
    const rules = await this.rules
      .find({
        workspaceId: context.workspaceId,
        projectKey: context.projectKey.toUpperCase(),
        enabled: true,
        executionMode: AUTOMATION_EXECUTION_MODES.event,
        trigger: context.trigger,
      })
      .exec();
    for (const rule of rules) await this.execute(rule, context);
  }

  async executeById(
    workspaceId: string,
    projectKey: string,
    ruleId: string,
  ): Promise<AutomationRuleHydratedDocument> {
    if (!isValidObjectId(ruleId))
      throw new BadRequestException("Invalid automation rule id.");
    const rule = await this.rules
      .findOne({
        _id: new Types.ObjectId(ruleId),
        workspaceId,
        projectKey: projectKey.toUpperCase(),
      })
      .exec();
    if (!rule) throw new NotFoundException("Automation rule was not found.");
    return this.execute(rule, {
      sourceEventId: `manual:${randomUUID()}`,
      workspaceId,
      projectKey: projectKey.toUpperCase(),
      trigger: rule.trigger,
    });
  }

  private conditionsMatch(
    rule: AutomationRuleDocument,
    context: AutomationContext,
  ): boolean {
    return rule.conditions.every((condition) => {
      const field = typeof condition.field === "string" ? condition.field : "";
      const expected = condition.value;
      if (!field) return false;
      return context[field as keyof AutomationContext] === expected;
    });
  }

  private async execute(
    rule: AutomationRuleHydratedDocument,
    context: AutomationContext,
  ): Promise<AutomationRuleHydratedDocument> {
    const alreadySucceeded = await this.runs.exists({
      workspaceId: rule.workspaceId,
      ruleId: String(rule._id),
      sourceEventId: context.sourceEventId,
      result: AUTOMATION_RUN_RESULTS.succeeded,
    });
    if (alreadySucceeded) return rule;
    if (!this.conditionsMatch(rule, context)) {
      rule.lastResult = AUTOMATION_RUN_RESULTS.skipped;
      rule.lastRunAt = new Date();
      await rule.save();
      return rule;
    }
    const now = new Date();
    const locked = await this.rules
      .findOneAndUpdate(
        {
          _id: rule._id,
          $or: [{ lockUntil: { $exists: false } }, { lockUntil: { $lt: now } }],
        },
        { lockUntil: new Date(now.getTime() + 60_000) },
        { new: true },
      )
      .exec();
    if (!locked) return rule;

    const startedAt = new Date();
    let result: AutomationRunResult = AUTOMATION_RUN_RESULTS.succeeded;
    let errorMessage: string | undefined;
    try {
      for (const action of locked.actions)
        await this.executeAction(locked, action, context);
      locked.lastResult = AUTOMATION_RUN_RESULTS.succeeded;
      locked.lastError = undefined;
    } catch (error) {
      result = AUTOMATION_RUN_RESULTS.failed;
      errorMessage =
        error instanceof Error ? error.message : "Unknown automation error";
      locked.lastResult = result;
      locked.lastError = errorMessage;
    }
    locked.lastRunAt = new Date();
    locked.runCount += 1;
    locked.lockUntil = undefined;
    await locked.save();
    await this.runs.create({
      workspaceId: locked.workspaceId,
      ruleId: String(locked._id),
      projectKey: locked.projectKey,
      sourceEventId: context.sourceEventId,
      result,
      context,
      error: errorMessage,
      startedAt,
      completedAt: new Date(),
    });
    return locked;
  }

  private async executeAction(
    rule: AutomationRuleDocument,
    action: AutomationActionDocument,
    context: AutomationContext,
  ): Promise<void> {
    if (action.type === AUTOMATION_ACTIONS.notifyDiscord) {
      const title = renderTemplate(
        typeof action.config.title === "string"
          ? action.config.title
          : rule.name,
        context,
      );
      const message = renderTemplate(
        stringConfig(action.config, "message"),
        context,
      );
      const channelType =
        typeof action.config.channelType === "string"
          ? action.config.channelType
          : undefined;
      await this.discord.send(
        rule.workspaceId,
        rule.projectKey,
        title,
        message,
        channelType,
      );
      return;
    }
    if (action.type === AUTOMATION_ACTIONS.createGithubIssue) {
      await this.github.createIssue(
        rule.workspaceId,
        rule.projectKey,
        renderTemplate(stringConfig(action.config, "title"), context),
        renderTemplate(stringConfig(action.config, "body"), context),
      );
      return;
    }
    const workItemKey =
      context.workItemKey ??
      (typeof action.config.workItemKey === "string"
        ? action.config.workItemKey
        : null);
    if (!workItemKey)
      throw new Error("This automation action requires a work item key.");
    if (action.type === AUTOMATION_ACTIONS.transitionWorkItem) {
      await this.workItems.transition(
        rule.workspaceId,
        workItemKey,
        stringConfig(action.config, "statusId"),
      );
      return;
    }
    if (action.type === AUTOMATION_ACTIONS.assignMember) {
      await this.workItems.assign(
        rule.workspaceId,
        workItemKey,
        stringConfig(action.config, "assigneeId"),
      );
      return;
    }
    if (action.type === AUTOMATION_ACTIONS.addLabel) {
      await this.workItems.addLabel(
        rule.workspaceId,
        workItemKey,
        stringConfig(action.config, "label"),
      );
      return;
    }
    throw new Error(`Unsupported automation action: ${action.type}`);
  }

  @Cron("0 * * * * *")
  async runScheduledRules(): Promise<void> {
    const now = new Date();
    const key = minuteKey(now);
    const rules = await this.rules
      .find({
        enabled: true,
        executionMode: AUTOMATION_EXECUTION_MODES.scheduled,
      })
      .limit(100)
      .exec();
    for (const rule of rules) {
      if (
        !rule.cronExpression ||
        rule.lastScheduledMinute === key ||
        !cronMatches(rule.cronExpression, now)
      )
        continue;
      const claimed = await this.rules
        .findOneAndUpdate(
          { _id: rule._id, lastScheduledMinute: { $ne: key } },
          { lastScheduledMinute: key },
          { new: true },
        )
        .exec();
      if (claimed)
        await this.execute(claimed, {
          sourceEventId: `scheduled:${key}`,
          workspaceId: claimed.workspaceId,
          projectKey: claimed.projectKey,
          trigger: claimed.trigger,
          scheduledAt: now.toISOString(),
        });
    }
  }
}

@Controller("projects/:projectKey/automations")
@RequireProjectAccess()
@RequireRoles(MEMBER_ROLES.owner)
export class AutomationsController {
  constructor(private readonly service: AutomationService) {}
  @Get() list(
    @Param("projectKey") key: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.list(workspaceId, key);
  }
  @Post() create(
    @Param("projectKey") key: string,
    @Body() body: Partial<AutomationRuleDocument>,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.create(workspaceId, key, body);
  }
  @Patch(":ruleId") toggle(
    @Param("projectKey") key: string,
    @Param("ruleId") ruleId: string,
    @Body("enabled") enabled: boolean,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.toggle(workspaceId, key, ruleId, enabled);
  }
  @Post(":ruleId/run") run(
    @Param("projectKey") key: string,
    @Param("ruleId") ruleId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.executeById(workspaceId, key, ruleId);
  }
  @Delete(":ruleId") delete(
    @Param("projectKey") key: string,
    @Param("ruleId") ruleId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.delete(workspaceId, key, ruleId);
  }
}

@Module({
  imports: [
    IntegrationsModule,
    WorkItemsModule,
    MongooseModule.forFeature([
      { name: AutomationRuleDocument.name, schema: AutomationRuleSchema },
      { name: AutomationRunDocument.name, schema: AutomationRunSchema },
    ]),
  ],
  controllers: [AutomationsController],
  providers: [AutomationService],
  exports: [AutomationService, MongooseModule],
})
export class AutomationsModule {}
