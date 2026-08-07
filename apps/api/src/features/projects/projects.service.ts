import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model, Types } from "mongoose";
import { MemberRole, MEMBER_ROLES } from "@tasks-dash/contracts";
import { Subject } from "rxjs";
import { Project } from "./project.domain";
import {
  PROJECT_REALTIME_EVENT_TYPES,
  ProjectRealtimeService,
} from "./project-realtime.service";
import { ProjectDocument, ProjectHydratedDocument } from "./project.schema";
import { CreateProjectDto } from "./projects.dto";

export const PROJECT_CREATED_EVENT = "projects.created";
export interface ProjectCreatedEvent {
  workspaceId: string;
  projectKey: string;
}

export const PROJECT_DELETED_EVENT = "projects.deleted";
export interface ProjectDeletedEvent {
  workspaceId: string;
  projectKey: string;
}

export interface ProjectStreamEvent {
  type: "created" | "updated" | "deleted" | "members_updated";
  workspaceId: string;
  projectKey: string;
}

@Injectable()
export class ProjectsService {
  readonly events$ = new Subject<ProjectStreamEvent>();

  constructor(
    @InjectModel(ProjectDocument.name)
    private readonly projects: Model<ProjectHydratedDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly events: EventEmitter2,
    private readonly realtime: ProjectRealtimeService,
  ) {}

  async create(
    workspaceId: string,
    actorId: string,
    dto: CreateProjectDto,
  ): Promise<ProjectHydratedDocument> {
    const project = Project.create({
      workspaceId,
      ...dto,
      leadId: dto.leadId ?? actorId,
    }).toPrimitives();
    const exists = await this.projects.exists({
      workspaceId,
      key: project.key,
    });
    if (exists) {
      throw new ConflictException(`Project key ${project.key} already exists.`);
    }
    const created = await this.projects.create({
      ...project,
      memberIds: [actorId],
      memberRoles: new Map([[actorId, MEMBER_ROLES.owner]]),
    });
    try {
      await this.events.emitAsync(PROJECT_CREATED_EVENT, {
        workspaceId,
        projectKey: created.key,
      } satisfies ProjectCreatedEvent);
    } catch {
      // Project creation remains durable when Discord is temporarily unavailable.
      // Provision-all or the Docs screen can retry channel provisioning later.
    }
    this.events$.next({
      type: "created",
      workspaceId,
      projectKey: created.key,
    });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.projectChanged,
      workspaceId,
      projectKey: created.key,
    });
    return created;
  }

  async updateMembers(
    workspaceId: string,
    key: string,
    memberIds: string[],
  ): Promise<ProjectHydratedDocument> {
    const project = await this.getByKey(workspaceId, key);
    project.memberIds = memberIds;

    if (!project.memberRoles) {
      project.memberRoles = new Map();
    }

    // Fetch members from db to get their workspace role
    const objectIds = memberIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const members = await this.connection
      .collection("members")
      .find({ _id: { $in: objectIds } })
      .toArray();
    const roleMap = new Map(members.map((m) => [String(m._id), m.role]));

    // Default new members to their workspace role
    for (const memberId of memberIds) {
      if (!project.memberRoles.has(memberId)) {
        const workspaceRole = roleMap.get(memberId) || MEMBER_ROLES.dev;
        project.memberRoles.set(memberId, workspaceRole);
      }
    }

    // Clean up removed members
    for (const roleKey of Array.from(project.memberRoles.keys())) {
      if (!memberIds.includes(roleKey)) {
        project.memberRoles.delete(roleKey);
      }
    }

    project.markModified("memberRoles");
    await project.save();
    this.realtime.syncMembers(workspaceId, project.key, memberIds);

    await this.events.emitAsync("project.members.updated", {
      workspaceId,
      projectKey: project.key,
    });
    this.events$.next({
      type: "members_updated",
      workspaceId,
      projectKey: project.key,
    });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.projectMembersChanged,
      workspaceId,
      projectKey: project.key,
      data: { memberIds },
    });
    return project;
  }

  async updateMemberRole(
    workspaceId: string,
    key: string,
    memberId: string,
    role: MemberRole,
  ): Promise<ProjectHydratedDocument> {
    const project = await this.getByKey(workspaceId, key);
    if (!project.memberIds.includes(memberId)) {
      throw new NotFoundException("Thành viên không thuộc dự án này.");
    }
    if (!project.memberRoles) {
      project.memberRoles = new Map();
    }
    project.memberRoles.set(memberId, role);
    project.markModified("memberRoles");
    await project.save();

    await this.events.emitAsync("project.members.updated", {
      workspaceId,
      projectKey: project.key,
    });
    this.events$.next({
      type: "members_updated",
      workspaceId,
      projectKey: project.key,
    });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.projectMembersChanged,
      workspaceId,
      projectKey: project.key,
      data: { memberId, role },
    });
    return project;
  }

  list(
    workspaceId: string,
    memberId?: string,
    role?: MemberRole,
  ): Promise<ProjectHydratedDocument[]> {
    if (
      memberId === undefined ||
      role === undefined ||
      role === MEMBER_ROLES.owner
    ) {
      return this.projects.find({ workspaceId }).sort({ name: 1 }).exec();
    }
    return this.projects
      .find({
        workspaceId,
        $or: [{ memberIds: memberId }, { leadId: memberId }],
      })
      .sort({ name: 1 })
      .exec();
  }

  async getByKey(
    workspaceId: string,
    key: string,
  ): Promise<ProjectHydratedDocument> {
    const project = await this.projects
      .findOne({ workspaceId, key: key.toUpperCase() })
      .exec();
    if (!project) throw new NotFoundException(`Project ${key} was not found.`);
    return project;
  }

  async linkRepository(
    workspaceId: string,
    projectKey: string,
    repositoryFullName: string,
  ): Promise<ProjectHydratedDocument> {
    const normalizedRepository = repositoryFullName.trim();
    const project = await this.getByKey(workspaceId, projectKey);
    const linkedElsewhere = await this.projects.exists({
      workspaceId,
      repositoryFullName: normalizedRepository,
      _id: { $ne: project._id },
    });
    if (linkedElsewhere) {
      throw new ConflictException(
        `Repository ${normalizedRepository} is already linked to another project.`,
      );
    }
    project.repositoryFullName = normalizedRepository;
    await project.save();
    return project;
  }

  async unlinkRepository(
    workspaceId: string,
    projectKey: string,
  ): Promise<ProjectHydratedDocument> {
    const project = await this.getByKey(workspaceId, projectKey);
    project.repositoryFullName = undefined;
    await project.save();
    return project;
  }

  async linkDiscordChannels(
    workspaceId: string,
    projectKey: string,
    channels: {
      guildId: string;
      updatesChannelId: string;
      updatesChannelName?: string;
      docsChannelId: string;
      docsChannelName: string;
    },
  ): Promise<ProjectHydratedDocument> {
    const project = await this.getByKey(workspaceId, projectKey);
    const docsLinkedElsewhere = await this.projects.exists({
      workspaceId,
      discordDocsChannelId: channels.docsChannelId,
      _id: { $ne: project._id },
    });
    if (docsLinkedElsewhere) {
      throw new ConflictException(
        "The Discord Docs channel is already assigned to another project.",
      );
    }
    project.discordGuildId = channels.guildId;
    project.discordUpdatesChannelId = channels.updatesChannelId;
    project.discordUpdatesChannelName = channels.updatesChannelName;
    project.discordDocsChannelId = channels.docsChannelId;
    project.discordDocsChannelName = channels.docsChannelName;
    project.discordProvisionedAt = new Date();
    await project.save();
    return project;
  }

  async nextSequence(workspaceId: string, key: string): Promise<number> {
    const project = await this.projects
      .findOneAndUpdate(
        { workspaceId, key: key.toUpperCase() },
        { $inc: { sequence: 1 } },
        { new: true },
      )
      .exec();
    if (!project) throw new NotFoundException(`Project ${key} was not found.`);
    return project.sequence;
  }

  async update(
    workspaceId: string,
    key: string,
    dto: { name?: string; description?: string; color?: string },
  ): Promise<ProjectHydratedDocument> {
    const project = await this.getByKey(workspaceId, key);
    if (dto.name !== undefined) project.name = dto.name.trim();
    if (dto.description !== undefined)
      project.description = dto.description.trim();
    if (dto.color !== undefined) project.color = dto.color;
    await project.save();
    this.events$.next({
      type: "updated",
      workspaceId,
      projectKey: project.key,
    });
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.projectChanged,
      workspaceId,
      projectKey: project.key,
    });
    return project;
  }

  async delete(workspaceId: string, key: string): Promise<{ ok: boolean }> {
    const normalizedKey = key.toUpperCase();
    const result = await this.projects
      .deleteOne({ workspaceId, key: normalizedKey })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Project ${normalizedKey} was not found.`);
    }

    // Force clean up all project-related database collections
    const collectionsToClean = [
      "work_items",
      "sprints",
      "automation_rules",
      "automation_runs",
      "workflows",
      "documents",
      "document_folders",
      "document_versions",
      "design_catalog_items",
      "discord_integrations",
    ];

    for (const colName of collectionsToClean) {
      try {
        await this.connection.collection(colName).deleteMany({
          workspaceId,
          projectKey: normalizedKey,
        });
      } catch (err) {
        // ignore individual collection clean up failure
      }
    }

    try {
      await this.events.emitAsync(PROJECT_DELETED_EVENT, {
        workspaceId,
        projectKey: normalizedKey,
      } satisfies ProjectDeletedEvent);
    } catch {
      // ignore event emission failure to keep deletion resilient
    }
    this.events$.next({
      type: "deleted",
      workspaceId,
      projectKey: normalizedKey,
    });
    this.realtime.clearProject(workspaceId, normalizedKey);
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.projectChanged,
      workspaceId,
      projectKey: normalizedKey,
      data: { deleted: true },
    });
    return { ok: true };
  }

  async getEnv(workspaceId: string, key: string): Promise<Record<string, string>> {
    const project = await this.getByKey(workspaceId, key);
    return Object.fromEntries(project.environmentVariables || new Map());
  }

  async updateEnv(
    workspaceId: string,
    key: string,
    envs: Record<string, string>,
  ): Promise<Record<string, string>> {
    const project = await this.getByKey(workspaceId, key);
    project.environmentVariables = new Map(Object.entries(envs));
    project.markModified("environmentVariables");
    await project.save();
    this.realtime.emit({
      type: PROJECT_REALTIME_EVENT_TYPES.projectChanged,
      workspaceId,
      projectKey: project.key,
      data: { envsUpdated: true },
    });
    return Object.fromEntries(project.environmentVariables);
  }
}
