import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { MemberRole, WORKFLOW_CATEGORIES } from "@tasks-dash/contracts";
import { WorkspaceId } from "../../common/auth-context";
import { MemberDocument, MemberSchema } from "../members/members.module";
import { ProjectDocument, ProjectHydratedDocument, ProjectSchema } from "../projects/project.schema";
import { WorkItemDocument, WorkItemHydratedDocument, WorkItemSchema } from "../work-items/work-item.schema";
import { WorkflowDocument, WorkflowHydratedDocument, WorkflowSchema } from "../workflows/workflows.schema";
export interface DashboardMemberResponse { name: string; email: string; avatarUrl: string; role: MemberRole; projectKeys: string[]; status: string; }
export interface DashboardProjectResponse { key: string; name: string; description: string; color: string; icon: string; leadId?: string; memberIds: string[]; repositoryFullName?: string; driveRootFolderId?: string; workflowId?: string; activeSprintId?: string; sequence: number; totalItems: number; completedItems: number; openPrItems: number; progress: number; members: DashboardMemberResponse[]; }
export interface DashboardDailyActivityResponse { _id: { projectKey: string; day: string }; created: number; completed: number; }
export interface DashboardOverviewResponse { projects: DashboardProjectResponse[]; members: DashboardMemberResponse[]; dailyActivity: DashboardDailyActivityResponse[]; }
@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(ProjectDocument.name) private readonly projects: Model<ProjectHydratedDocument>,
    @InjectModel(WorkItemDocument.name) private readonly items: Model<WorkItemHydratedDocument>,
    @InjectModel(WorkflowDocument.name) private readonly workflows: Model<WorkflowHydratedDocument>,
    @InjectModel(MemberDocument.name) private readonly members: Model<MemberDocument>,
  ) {}
  async overview(workspaceId: string): Promise<DashboardOverviewResponse> {
    const [projects, workflows, memberDocuments, dailyActivity] = await Promise.all([
      this.projects.find({ workspaceId }).lean().exec(),
      this.workflows.find({ workspaceId }).lean().exec(),
      this.members.find({ workspaceId }).lean().exec(),
      this.items.aggregate<DashboardDailyActivityResponse>([
        { $match: { workspaceId } },
        { $group: { _id: { projectKey: "$projectKey", day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } }, created: { $sum: 1 }, completed: { $sum: { $cond: [{ $ifNull: ["$completedAt", false] }, 1, 0] } } } },
        { $sort: { "_id.day": 1 } },
      ]).exec(),
    ]);
    const members: DashboardMemberResponse[] = memberDocuments.map((member) => ({ name: member.name, email: member.email, avatarUrl: member.avatarUrl, role: member.role, projectKeys: member.projectKeys, status: member.status }));
    const projectCards = await Promise.all(projects.map(async (project): Promise<DashboardProjectResponse> => {
      const workflow = workflows.find((item) => item.projectKey === project.key);
      const doneStatusIds = workflow?.statuses.filter((status) => status.category === WORKFLOW_CATEGORIES.done).map((status) => status.id) ?? [];
      const [totalItems, completedItems, openPrItems] = await Promise.all([
        this.items.countDocuments({ workspaceId, projectKey: project.key }),
        this.items.countDocuments({ workspaceId, projectKey: project.key, statusId: { $in: doneStatusIds } }),
        this.items.countDocuments({ workspaceId, projectKey: project.key, "github.pullRequestNumber": { $exists: true }, completedAt: { $exists: false } }),
      ]);
      return { key: project.key, name: project.name, description: project.description, color: project.color, icon: project.icon, leadId: project.leadId, memberIds: project.memberIds, repositoryFullName: project.repositoryFullName, driveRootFolderId: project.driveRootFolderId, workflowId: project.workflowId, activeSprintId: project.activeSprintId, sequence: project.sequence, totalItems, completedItems, openPrItems, progress: totalItems ? Math.round((completedItems / totalItems) * 100) : 0, members: members.filter((member) => member.projectKeys.includes(project.key)) };
    }));
    return { projects: projectCards, members, dailyActivity };
  }
}
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get("overview") overview(@WorkspaceId() workspaceId: string): Promise<DashboardOverviewResponse> { return this.service.overview(workspaceId); }
}
@Module({ imports: [MongooseModule.forFeature([{ name: ProjectDocument.name, schema: ProjectSchema }, { name: WorkItemDocument.name, schema: WorkItemSchema }, { name: WorkflowDocument.name, schema: WorkflowSchema }, { name: MemberDocument.name, schema: MemberSchema }])], controllers: [DashboardController], providers: [DashboardService], exports: [DashboardService] })
export class DashboardModule {}
