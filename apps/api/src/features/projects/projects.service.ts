import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Project } from "./project.domain";
import { ProjectDocument, ProjectHydratedDocument } from "./project.schema";
import { CreateProjectDto } from "./projects.dto";
@Injectable()
export class ProjectsService {
  constructor(@InjectModel(ProjectDocument.name) private readonly projects: Model<ProjectHydratedDocument>) {}
  async create(workspaceId: string, actorId: string, dto: CreateProjectDto): Promise<ProjectHydratedDocument> {
    const project = Project.create({ workspaceId, ...dto, leadId: dto.leadId ?? actorId }).toPrimitives();
    const exists = await this.projects.exists({ workspaceId, key: project.key });
    if (exists) throw new ConflictException(`Project key ${project.key} already exists.`);
    return this.projects.create({ ...project, memberIds: [actorId] });
  }
  list(workspaceId: string): Promise<ProjectHydratedDocument[]> { return this.projects.find({ workspaceId }).sort({ name: 1 }).exec(); }
  async getByKey(workspaceId: string, key: string): Promise<ProjectHydratedDocument> {
    const project = await this.projects.findOne({ workspaceId, key: key.toUpperCase() }).exec();
    if (!project) throw new NotFoundException(`Project ${key} was not found.`);
    return project;
  }
  async nextSequence(workspaceId: string, key: string): Promise<number> {
    const project = await this.projects.findOneAndUpdate({ workspaceId, key: key.toUpperCase() }, { $inc: { sequence: 1 } }, { new: true }).exec();
    if (!project) throw new NotFoundException(`Project ${key} was not found.`);
    return project.sequence;
  }
}
