import { Body, Controller, Delete, Get, Param, Patch, Post, Inject, forwardRef } from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  AuthSession,
  CurrentMemberRole,
  CurrentSession,
  RequireProjectAccess,
  RequireRoles,
  WorkspaceId,
} from "../../common/auth-context";
import { MEMBER_ROLES, MemberRole } from "@tasks-dash/contracts";
import { CreateProjectCommand, ListProjectsQuery } from "./projects.cqrs";
import { CreateProjectDto, UpdateProjectDto } from "./projects.dto";
import { ProjectsService } from "./projects.service";
import { MembersService } from "../members/members.service";

@Controller("projects")
export class ProjectsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    private readonly service: ProjectsService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
  ) {}

  @Get()
  list(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @CurrentMemberRole() role: MemberRole,
  ) {
    return this.queries.execute(
      new ListProjectsQuery(workspaceId, session.memberId, role),
    );
  }

  @Get(":key")
  @RequireProjectAccess("key")
  get(@Param("key") key: string, @WorkspaceId() workspaceId: string) {
    return this.service.getByKey(workspaceId, key);
  }

  @Get(":key/members")
  @RequireProjectAccess("key")
  async listMembers(@Param("key") key: string, @WorkspaceId() workspaceId: string) {
    const project = await this.service.getByKey(workspaceId, key);
    const workspaceData = await this.membersService.list(workspaceId);
    const workspaceMembers = (workspaceData.members as any[]) || [];
    
    // Filter members that belong to the project, mapping to their project role
    const projectMembers = (project.memberIds && project.memberIds.length > 0
      ? workspaceMembers.filter((m) => project.memberIds.includes(String(m._id)))
      : workspaceMembers).map((m) => {
        const projectRole = project.memberRoles instanceof Map
          ? project.memberRoles.get(String(m._id))
          : (project.memberRoles as any)?.[String(m._id)];
        return {
          ...m,
          role: projectRole || m.role,
        };
      });

    return {
      projectMembers,
      workspaceMembers,
    };
  }

  @Post()
  @RequireRoles(MEMBER_ROLES.owner)
  create(
    @Body() dto: CreateProjectDto,
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
  ) {
    return this.commands.execute(
      new CreateProjectCommand(workspaceId, session.userId, dto),
    );
  }

  @Patch(":key")
  @RequireProjectAccess("key")
  @RequireRoles(MEMBER_ROLES.owner)
  update(
    @Param("key") key: string,
    @Body() dto: UpdateProjectDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.update(workspaceId, key, dto);
  }

  @Delete(":key")
  @RequireProjectAccess("key")
  @RequireRoles(MEMBER_ROLES.owner)
  delete(@Param("key") key: string, @WorkspaceId() workspaceId: string) {
    return this.service.delete(workspaceId, key);
  }

  @Patch(":key/members")
  @RequireProjectAccess("key")
  @RequireRoles(MEMBER_ROLES.owner)
  updateMembers(
    @Param("key") key: string,
    @Body("memberIds") memberIds: string[],
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.updateMembers(workspaceId, key, memberIds);
  }

  @Patch(":key/members/:memberId/role")
  @RequireProjectAccess("key")
  @RequireRoles(MEMBER_ROLES.owner)
  updateMemberRole(
    @Param("key") key: string,
    @Param("memberId") memberId: string,
    @Body("role") role: MemberRole,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.updateMemberRole(workspaceId, key, memberId, role);
  }
}
