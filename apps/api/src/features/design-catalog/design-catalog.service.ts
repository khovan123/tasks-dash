import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { ProjectsService } from "../projects/projects.service";
import { DiscordAdapter } from "../integrations/discord.adapter";
import {
  DesignCatalogItemLogDocument,
  DesignCatalogItemLogHydratedDocument,
} from "../integrations/integration.schemas";
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
    @InjectModel(DesignCatalogItemLogDocument.name)
    private readonly itemLogs: Model<DesignCatalogItemLogHydratedDocument>,
    private readonly projects: ProjectsService,
    private readonly discord: DiscordAdapter,
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
    let item: DesignCatalogHydratedDocument;
    try {
      item = await this.items.create({
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

    // Log to Discord #designer channel
    try {
      const integration = await this.discord.getProjectIntegration(workspaceId, key);
      if (integration?.designerChannelId) {
        const typeLabel = dto.type ? `\`${dto.type}\`` : "Design";
        const description = [
          `:paperclip: **[${dto.name.trim()}](${dto.figmaUrl.trim()})**`,
          dto.description?.trim() ? `> ${dto.description.trim()}` : "",
          dto.tags?.length ? `:label: ${dto.tags.map((t) => `\`${t}\``).join(" ")}` : "",
        ].filter(Boolean).join("\n");
        const msgId = await this.discord.sendToChannel(integration.designerChannelId, {
          title: `:art: ${typeLabel} added`,
          description,
          color: 0xa855f7,
          url: dto.figmaUrl.trim(),
        });
        await this.itemLogs.create({
          designId: String(item._id),
          discordMessageId: msgId,
          discordChannelId: integration.designerChannelId,
        });
      }
    } catch { /* non-critical */ }

    return item;
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

    // Log update to Discord design channel as reply
    try {
      const log = await this.itemLogs.findOne({ designId: String(item._id) }).exec();
      if (log) {
        const typeLabel = item.type ? `\`${item.type}\`` : "Design";
        const description = [
          `:paperclip: **[${item.name}](${item.figmaUrl})**`,
          item.description ? `> ${item.description}` : "",
          item.tags?.length ? `:label: ${item.tags.map((t) => `\`${t}\``).join(" ")}` : "",
        ].filter(Boolean).join("\n");
        await this.discord.sendThreadReply(log.discordChannelId, log.discordMessageId, {
          title: `:art: ${typeLabel} updated`,
          description,
          url: item.figmaUrl,
        });
      }
    } catch { /* non-critical */ }

    return item;
  }

  async remove(
    workspaceId: string,
    projectKey: string,
    itemId: string,
  ): Promise<void> {
    const item = await this.find(workspaceId, projectKey, itemId);

    // Delete Discord message in #designer channel
    try {
      const log = await this.itemLogs
        .findOne({ designId: itemId })
        .exec();
      if (log) {
        await this.discord.deleteMessage(log.discordChannelId, log.discordMessageId);
        await this.itemLogs.deleteOne({ _id: log._id }).exec();
      }
    } catch { /* non-critical */ }

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
