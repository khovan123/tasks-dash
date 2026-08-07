import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  GITHUB_PR_STATES,
  MEMBER_PRESENCE,
  MemberRole,
  WORKFLOW_CATEGORIES,
} from "@tasks-dash/contracts";
import { WorkspaceId } from "../../common/auth-context";
import { MemberDocument, MemberSchema } from "../members/member.schema";
import {
  ProjectDocument,
  ProjectHydratedDocument,
  ProjectSchema,
} from "../projects/project.schema";
import {
  WorkItemDocument,
  WorkItemHydratedDocument,
  WorkItemSchema,
} from "../work-items/work-item.schema";
import {
  WorkflowDocument,
  WorkflowHydratedDocument,
  WorkflowSchema,
} from "../workflows/workflows.schema";
import { ProjectsModule } from "../projects/projects.module";
import { ProjectRealtimeService } from "../projects/project-realtime.service";

export interface DashboardMemberResponse {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: MemberRole;
  status: string;
}
export interface DashboardProjectResponse {
  key: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  leadId?: string;
  repositoryFullName?: string;
  discordDocsChannelId?: string;
  workflowId?: string;
  activeSprintId?: string;
  sequence: number;
  totalItems: number;
  completedItems: number;
  openPrItems: number;
  progress: number;
}
export interface DashboardDailyActivityResponse {
  _id: { projectKey: string; day: string };
  created: number;
  completed: number;
}
export interface DashboardOverviewResponse {
  projects: DashboardProjectResponse[];
  members: DashboardMemberResponse[];
  dailyActivity: DashboardDailyActivityResponse[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(ProjectDocument.name)
    private readonly projects: Model<ProjectHydratedDocument>,
    @InjectModel(WorkItemDocument.name)
    private readonly items: Model<WorkItemHydratedDocument>,
    @InjectModel(WorkflowDocument.name)
    private readonly workflows: Model<WorkflowHydratedDocument>,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberDocument>,
    private readonly realtime: ProjectRealtimeService,
  ) {}

  async overview(workspaceId: string): Promise<DashboardOverviewResponse> {
    const [projects, workflows, memberDocuments, dailyActivity] = await Promise.all([
      this.projects.find({ workspaceId }).lean().exec(),
      this.workflows.find({ workspaceId }).lean().exec(),
      this.members.find({ workspaceId }).lean().exec(),
      this.items.aggregate<DashboardDailyActivityResponse>([
        { $match: { workspaceId } },
        {
          $group: {
            _id: {
              projectKey: "$projectKey",
              day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            },
            created: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $ifNull: ["$completedAt", false] }, 1, 0] },
            },
          },
        },
        { $sort: { "_id.day": 1 } },
      ]).exec(),
    ]);

    const presenceByMemberId = this.realtime.getPresenceSnapshot(workspaceId, "");
    const members: DashboardMemberResponse[] = memberDocuments.map((member) => {
      const memberId = String(member._id);
      return {
        id: memberId,
        name: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
        role: member.role,
        status: presenceByMemberId[memberId] ?? MEMBER_PRESENCE.offline,
      };
    });

    const projectCards = await Promise.all(
      projects.map(async (project): Promise<DashboardProjectResponse> => {
        const workflow = workflows.find((item) => item.projectKey === project.key);
        const doneStatusIds =
          workflow?.statuses
            .filter((status) => status.category === WORKFLOW_CATEGORIES.done)
            .map((status) => status.id) ?? [];
        const [totalItems, completedItems, openPrItems] = await Promise.all([
          this.items.countDocuments({ workspaceId, projectKey: project.key }),
          this.items.countDocuments({ workspaceId, projectKey: project.key, statusId: { $in: doneStatusIds } }),
          this.countOpenPullRequests(workspaceId, project.key, doneStatusIds),
        ]);
        return {
          key: project.key,
          name: project.name,
          description: project.description,
          color: project.color,
          icon: project.icon,
          leadId: project.leadId,
          repositoryFullName: project.repositoryFullName,
          discordDocsChannelId: project.discordDocsChannelId,
          workflowId: project.workflowId,
          activeSprintId: project.activeSprintId,
          sequence: project.sequence,
          totalItems,
          completedItems,
          openPrItems,
          progress: totalItems ? Math.round((completedItems / totalItems) * 100) : 0,
        };
      }),
    );

    return { projects: projectCards, members, dailyActivity };
  }

  private async countOpenPullRequests(
    workspaceId: string,
    projectKey: string,
    doneStatusIds: string[],
  ): Promise<number> {
    const result = await this.items.aggregate<{ total: number }>([
      {
        $match: {
          workspaceId,
          projectKey,
          statusId: { $nin: doneStatusIds },
          "github.pullRequests.0": { $exists: true },
        },
      },
      { $unwind: "$github.pullRequests" },
      {
        $match: {
          "github.pullRequests.state": GITHUB_PR_STATES.open,
        },
      },
      {
        $group: {
          _id: "$github.pullRequests.number",
        },
      },
      {
        $count: "total",
      },
    ]).exec();

    return result[0]?.total ?? 0;
  }
}

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("overview")
  overview(@WorkspaceId() workspaceId: string): Promise<DashboardOverviewResponse> {
    return this.service.overview(workspaceId);
  }
}

@Module({
  imports: [
    ProjectsModule,
    MongooseModule.forFeature([
      { name: ProjectDocument.name, schema: ProjectSchema },
      { name: WorkItemDocument.name, schema: WorkItemSchema },
      { name: WorkflowDocument.name, schema: WorkflowSchema },
      { name: MemberDocument.name, schema: MemberSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
