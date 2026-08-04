import { Controller, Get, Headers, Injectable, Module } from "@nestjs/common";
import { InjectModel, MongooseModule } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { WORKFLOW_CATEGORIES } from "@tasks-dash/contracts";
import { MemberDocument, MemberSchema } from "../members/members.module";
import { ProjectDocument, ProjectHydratedDocument, ProjectSchema } from "../projects/project.schema";
import { WorkItemDocument, WorkItemHydratedDocument, WorkItemSchema } from "../work-items/work-item.schema";
import { WorkflowDocument, WorkflowHydratedDocument, WorkflowSchema } from "../workflows/workflows.schema";
@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(ProjectDocument.name) private readonly projects: Model<ProjectHydratedDocument>,
    @InjectModel(WorkItemDocument.name) private readonly items: Model<WorkItemHydratedDocument>,
    @InjectModel(WorkflowDocument.name) private readonly workflows: Model<WorkflowHydratedDocument>,
    @InjectModel(MemberDocument.name) private readonly members: Model<MemberDocument>,
  ) {}
  async overview(workspaceId: string) {
    const [projects, workflows, members, daily] = await Promise.all([
      this.projects.find({ workspaceId }).lean().exec(),
      this.workflows.find({ workspaceId }).lean().exec(),
      this.members.find({ workspaceId }).lean().exec(),
      this.items.aggregate([
        { $match: { workspaceId } },
        { $group: { _id: { projectKey: "$projectKey", day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } }, created: { $sum: 1 }, completed: { $sum: { $cond: [{ $ifNull: ["$completedAt", false] }, 1, 0] } } } },
        { $sort: { "_id.day": 1 } },
      ]),
    ]);
    const projectCards = await Promise.all(projects.map(async (project) => {
      const workflow = workflows.find((item) => item.projectKey === project.key);
      const doneStatusIds = workflow?.statuses.filter((status) => status.category === WORKFLOW_CATEGORIES.done).map((status) => status.id) ?? [];
      const [totalItems, completedItems, openPrItems] = await Promise.all([
        this.items.countDocuments({ workspaceId, projectKey: project.key }),
        this.items.countDocuments({ workspaceId, projectKey: project.key, statusId: { $in: doneStatusIds } }),
        this.items.countDocuments({ workspaceId, projectKey: project.key, "github.pullRequestNumber": { $exists: true }, completedAt: { $exists: false } }),
      ]);
      return { ...project, totalItems, completedItems, openPrItems, progress: totalItems ? Math.round((completedItems / totalItems) * 100) : 0, members: members.filter((member) => member.projectKeys.includes(project.key)) };
    }));
    return { projects: projectCards, members, dailyActivity: daily };
  }
}
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get("overview") overview(@Headers("x-workspace-id") workspaceId = "demo") { return this.service.overview(workspaceId); }
}
@Module({
  imports: [MongooseModule.forFeature([
    { name: ProjectDocument.name, schema: ProjectSchema }, { name: WorkItemDocument.name, schema: WorkItemSchema }, { name: WorkflowDocument.name, schema: WorkflowSchema }, { name: MemberDocument.name, schema: MemberSchema },
  ])], controllers: [DashboardController], providers: [DashboardService], exports: [DashboardService],
})
export class DashboardModule {}
