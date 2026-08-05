import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Project } from "./project.domain";
import {
  ProjectDocument,
  ProjectHydratedDocument,
} from "./project.schema";
import { CreateProjectDto } from "./projects.dto";

export const PROJECT_CREATED_EVENT = "projects.created";
export interface ProjectCreatedEvent {
  workspaceId: string;
  projectKey: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(ProjectDocument.name)
    private readonly projects: Model<ProjectHydratedDocument>,
    private readonly events: EventEmitter2,
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
    const exists = await this.projects.exists({ workspaceId, key: project.key });
    if (exists) {
      throw new ConflictException(`Project key ${project.key} already exists.`);
    }
    const created = await this.projects.create(project);
    try {
      await this.events.emitAsync(PROJECT_CREATED_EVENT, {
        workspaceId,
        projectKey: created.key,
      } satisfies ProjectCreatedEvent);
    } catch {
      // Project creation remains durable when Discord is temporarily unavailable.
      // Provision-all or the Docs screen can retry channel provisioning later.
    }
    return created;
  }

  list(workspaceId: string): Promise<ProjectHydratedDocument[]> {
    return this.projects.find({ workspaceId }).sort({ name: 1 }).exec();
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
}
