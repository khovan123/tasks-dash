import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Project } from "./project.domain";
import {
  ProjectDocument,
  ProjectHydratedDocument,
} from "./project.schema";
import { CreateProjectDto } from "./projects.dto";

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(ProjectDocument.name)
    private readonly projects: Model<ProjectHydratedDocument>,
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
    return this.projects.create(project);
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
