import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { ProjectsService } from "../projects/projects.service";
import {
  CreateDesignCatalogItemDto,
  UpdateDesignCatalogItemDto,
} from "./design-catalog.dto";
import {
  DesignCatalogDocument,
  DesignCatalogHydratedDocument,
} from "./design-catalog.schema";

@Injectable()
export class DesignCatalogService {
  constructor(
    @InjectModel(DesignCatalogDocument.name)
    private readonly items: Model<DesignCatalogHydratedDocument>,
    private readonly projects: ProjectsService,
  ) {}

  list(workspaceId: string, projectKey: string) {
    return this.items
      .find({ workspaceId, projectKey: projectKey.toUpperCase() })
      .sort({ type: 1, name: 1 })
      .exec();
  }

  async create(
    workspaceId: string,
    projectKey: string,
    memberId: string,
    dto: CreateDesignCatalogItemDto,
  ) {
    const key = projectKey.toUpperCase();
    await this.projects.getByKey(workspaceId, key);
    try {
      return await this.items.create({
        ...dto,
        workspaceId,
        projectKey: key,
        name: dto.name.trim(),
        figmaUrl: dto.figmaUrl.trim(),
        description: dto.description.trim(),
        tags: dto.tags.map((tag) => tag.trim()).filter(Boolean),
        createdByMemberId: memberId,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          "This Figma link already exists in the project Designer Catalog.",
        );
      }
      throw error;
    }
  }

  async update(
    workspaceId: string,
    projectKey: string,
    itemId: string,
    dto: UpdateDesignCatalogItemDto,
  ) {
    const item = await this.find(workspaceId, projectKey, itemId);
    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.type !== undefined) item.type = dto.type;
    if (dto.figmaUrl !== undefined) item.figmaUrl = dto.figmaUrl.trim();
    if (dto.description !== undefined) item.description = dto.description.trim();
    if (dto.tags !== undefined) {
      item.tags = dto.tags.map((tag) => tag.trim()).filter(Boolean);
    }
    await item.save();
    return item;
  }

  async remove(
    workspaceId: string,
    projectKey: string,
    itemId: string,
  ): Promise<void> {
    const item = await this.find(workspaceId, projectKey, itemId);
    await this.items.deleteOne({ _id: item._id }).exec();
  }

  private async find(
    workspaceId: string,
    projectKey: string,
    itemId: string,
  ): Promise<DesignCatalogHydratedDocument> {
    if (!isValidObjectId(itemId)) {
      throw new NotFoundException("Designer Catalog item was not found.");
    }
    const item = await this.items
      .findOne({
        _id: itemId,
        workspaceId,
        projectKey: projectKey.toUpperCase(),
      })
      .exec();
    if (!item) throw new NotFoundException("Designer Catalog item was not found.");
    return item;
  }
}
