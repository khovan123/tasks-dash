import { Controller, Module, Post } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { AUTOMATION_ACTIONS, AUTOMATION_EXECUTION_MODES, AUTOMATION_TRIGGERS, GITHUB_PR_STATES, MEMBER_ROLES, PRIORITIES, SPRINT_STATES, WORKFLOW_CATEGORIES, WORK_ITEM_TYPES } from "@tasks-dash/contracts";
@Controller("demo")
export class DemoController {
  constructor(@InjectConnection() private readonly connection: Connection) {}
  @Post("seed")
  async seed() {
    const workspaceId = "demo";
    const now = new Date();
    await Promise.all(["projects", "members", "workflows", "work_items", "sprints", "automation_rules"].map((name) => this.connection.collection(name).deleteMany({ workspaceId })));
    const members = [
      { _id: "u-minh", workspaceId, name: "Minh Phan", email: "minh@example.com", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=MP", role: MEMBER_ROLES.owner, projectKeys: ["TD", "SK", "FW"], status: "ONLINE", createdAt: now, updatedAt: now },
      { _id: "u-an", workspaceId, name: "An Nguyen", email: "an@example.com", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=AN", role: MEMBER_ROLES.projectLead, projectKeys: ["TD", "SK"], status: "ONLINE", createdAt: now, updatedAt: now },
      { _id: "u-linh", workspaceId, name: "Linh Tran", email: "linh@example.com", avatarUrl: "https://api.dicebear.com/9.x/initials/svg?seed=LT", role: MEMBER_ROLES.member, projectKeys: ["TD", "FW"], status: "AWAY", createdAt: now, updatedAt: now },
    ];
    const projects = [
      { workspaceId, key: "TD", name: "Tasks Dash", description: "Multi-project delivery platform", color: "#4f46e5", icon: "LayoutDashboard", leadId: "u-an", memberIds: ["u-minh","u-an","u-linh"], repositoryFullName: "khovan123/tasks-dash", driveRootFolderId: "drive-td", sequence: 8, createdAt: now, updatedAt: now },
      { workspaceId, key: "SK", name: "StayKey", description: "Homestay operations platform", color: "#0f766e", icon: "KeyRound", leadId: "u-an", memberIds: ["u-minh","u-an"], repositoryFullName: "khovan123/staykey", driveRootFolderId: "drive-sk", sequence: 5, createdAt: now, updatedAt: now },
      { workspaceId, key: "FW", name: "FarmWatch", description: "Farm simulation game", color: "#65a30d", icon: "Sprout", leadId: "u-minh", memberIds: ["u-minh","u-linh"], repositoryFullName: "khovan123/farmwatch", driveRootFolderId: "drive-fw", sequence: 4, createdAt: now, updatedAt: now },
    ];
    const statuses = [
      { id: "backlog", name: "Backlog", category: WORKFLOW_CATEGORIES.toDo, color: "#64748b", order: 0 },
      { id: "todo", name: "To do", category: WORKFLOW_CATEGORIES.toDo, color: "#3b82f6", order: 1 },
      { id: "progress", name: "In progress", category: WORKFLOW_CATEGORIES.inProgress, color: "#f59e0b", order: 2 },
      { id: "review", name: "Code review", category: WORKFLOW_CATEGORIES.inProgress, color: "#8b5cf6", order: 3 },
      { id: "done", name: "Done", category: WORKFLOW_CATEGORIES.done, color: "#22c55e", order: 4 },
    ];
    const transitions = [
      { id: "t1", name: "Start", fromStatusId: "todo", toStatusId: "progress" }, { id: "t2", name: "Review", fromStatusId: "progress", toStatusId: "review" },
      { id: "t3", name: "Complete", fromStatusId: "review", toStatusId: "done" }, { id: "t4", name: "Reopen", fromStatusId: "done", toStatusId: "todo" },
      { id: "t5", name: "Plan", fromStatusId: "backlog", toStatusId: "todo" },
    ];
    const workflows = projects.map((project) => ({ workspaceId, projectKey: project.key, name: `${project.name} workflow`, defaultStatusId: "backlog", statuses, transitions, createdAt: now, updatedAt: now }));
    const items = [
      ["TD",1,WORK_ITEM_TYPES.module,"Portfolio & project foundation","done",PRIORITIES.high,"u-an",8,null],
      ["TD",2,WORK_ITEM_TYPES.story,"Render multi-project overview","done",PRIORITIES.high,"u-linh",5,12],
      ["TD",3,WORK_ITEM_TYPES.task,"Create configurable workflow builder","progress",PRIORITIES.high,"u-an",8,18],
      ["TD",4,WORK_ITEM_TYPES.task,"Link Google Drive folder tree","review",PRIORITIES.medium,"u-linh",5,21],
      ["TD",5,WORK_ITEM_TYPES.bug,"PR counters do not refresh after merge","todo",PRIORITIES.high,"u-an",3,24],
      ["TD",6,WORK_ITEM_TYPES.story,"Add Discord automation actions","backlog",PRIORITIES.medium,null,5,null],
      ["TD",7,WORK_ITEM_TYPES.task,"Daily project statistics aggregation","done",PRIORITIES.medium,"u-linh",3,27],
      ["TD",8,WORK_ITEM_TYPES.subTask,"Verify GitHub webhook signatures","review",PRIORITIES.high,"u-an",2,31],
      ["SK",1,WORK_ITEM_TYPES.module,"Revenue dashboard","done",PRIORITIES.high,"u-an",8,null],
      ["SK",2,WORK_ITEM_TYPES.story,"Track paid and unpaid revenue","progress",PRIORITIES.high,"u-an",5,7],
      ["SK",3,WORK_ITEM_TYPES.task,"Add owner portfolio filters","todo",PRIORITIES.medium,"u-minh",3,null],
      ["SK",4,WORK_ITEM_TYPES.bug,"Occupancy calculation edge case","review",PRIORITIES.high,"u-an",5,11],
      ["SK",5,WORK_ITEM_TYPES.task,"Property-scoped permissions","backlog",PRIORITIES.medium,null,8,null],
      ["FW",1,WORK_ITEM_TYPES.module,"Core farming loop","done",PRIORITIES.high,"u-minh",13,null],
      ["FW",2,WORK_ITEM_TYPES.story,"Weather care flow","progress",PRIORITIES.high,"u-linh",8,4],
      ["FW",3,WORK_ITEM_TYPES.task,"Disease cure success flow","todo",PRIORITIES.high,"u-linh",5,null],
      ["FW",4,WORK_ITEM_TYPES.task,"HTX join approval","backlog",PRIORITIES.medium,null,5,null],
    ].map(([projectKey, sequence, type, summary, statusId, priority, assigneeId, storyPoints, pr]) => ({
      workspaceId, projectKey, sequence, key: `${projectKey}-${sequence}`, type, summary, description: "Seeded demo work item", statusId, priority, assigneeId, reporterId: "u-minh", labels: ["demo"], storyPoints, sprintId: statusId === "backlog" ? undefined : `${projectKey}-SPRINT-1`, github: pr ? { pullRequestNumber: pr, pullRequestUrl: `https://github.com/khovan123/tasks-dash/pull/${pr}`, pullRequestState: statusId === "done" ? GITHUB_PR_STATES.merged : GITHUB_PR_STATES.open, commitShas: [] } : undefined, completedAt: statusId === "done" ? now : undefined, createdAt: new Date(now.getTime() - Number(sequence) * 86400000), updatedAt: now,
    }));
    const sprints = projects.map((project) => ({ _id: `${project.key}-SPRINT-1`, workspaceId, projectKey: project.key, name: "Sprint 1", goal: `Deliver the ${project.name} MVP`, state: SPRINT_STATES.active, startDate: new Date(now.getTime()-7*86400000), endDate: new Date(now.getTime()+7*86400000), capacity: 40, createdAt: now, updatedAt: now }));
    const automations = [{ workspaceId, projectKey: "TD", name: "Notify Discord when PR is opened", enabled: true, trigger: AUTOMATION_TRIGGERS.pullRequestOpened, executionMode: AUTOMATION_EXECUTION_MODES.event, conditions: [], actions: [{ type: AUTOMATION_ACTIONS.notifyDiscord, config: { message: "A pull request was opened" } }], runCount: 3, createdAt: now, updatedAt: now }];
    await this.connection.collection("members").insertMany(members as any[]);
    await this.connection.collection("projects").insertMany(projects);
    await this.connection.collection("workflows").insertMany(workflows);
    await this.connection.collection("work_items").insertMany(items as any[]);
    await this.connection.collection("sprints").insertMany(sprints as any[]);
    await this.connection.collection("automation_rules").insertMany(automations);
    return { seeded: true, projects: projects.length, workItems: items.length, members: members.length };
  }
}
@Module({ controllers: [DemoController] })
export class DemoModule {}
