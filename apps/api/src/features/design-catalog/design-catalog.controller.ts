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
  RequireProjectAccess,
  RequireRoles,
  WorkspaceId,
} from "../../common/auth-context";
import {
  CreateDesignCatalogItemDto,
  UpdateDesignCatalogItemDto,
} from "./design-catalog.dto";
import { DesignCatalogService } from "./design-catalog.service";

@Controller("projects/:projectKey/design-catalog")
@RequireProjectAccess()
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
    MEMBER_ROLES.designer,
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
    MEMBER_ROLES.designer,
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
    MEMBER_ROLES.designer,
  )
  remove(
    @WorkspaceId() workspaceId: string,
    @Param("projectKey") projectKey: string,
    @Param("itemId") itemId: string,
  ): Promise<void> {
    return this.service.remove(workspaceId, projectKey, itemId);
  }
}
