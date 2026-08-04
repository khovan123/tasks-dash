import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  AuthSession,
  CurrentSession,
  RequireRoles,
  WorkspaceId,
} from "../../common/auth-context";
import {
  CreateDesignCatalogItemDto,
  UpdateDesignCatalogItemDto,
} from "./design-catalog.dto";
import { DesignCatalogService } from "./design-catalog.service";

@Controller("projects/:projectKey/design-catalog")
export class DesignCatalogController {
  constructor(private readonly service: DesignCatalogService) {}

  @Get()
  list(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
  ) {
    return this.service.list(workspaceId, projectKey);
  }

  @Post()
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
    MEMBER_ROLES.member,
  )
  create(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @Param("projectKey") projectKey: string,
    @Body() body: CreateDesignCatalogItemDto,
  ) {
    return this.service.create(
      workspaceId,
      projectKey,
      session.userId,
      body,
    );
  }

  @Patch(":itemId")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
    MEMBER_ROLES.member,
  )
  update(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateDesignCatalogItemDto,
  ) {
    return this.service.update(workspaceId, projectKey, itemId, body);
  }

  @Delete(":itemId")
  @RequireRoles(
    MEMBER_ROLES.owner,
    MEMBER_ROLES.admin,
    MEMBER_ROLES.projectLead,
  )
  remove(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Param("itemId") itemId: string,
  ): Promise<void> {
    return this.service.remove(workspaceId, projectKey, itemId);
  }
}
