import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  MessageEvent,
  Param,
  Patch,
  Post,
  Sse,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { Observable, interval, merge, of } from "rxjs";
import { filter, map } from "rxjs/operators";
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
import { ProjectRealtimeService } from "./project-realtime.service";
import { CreateProjectDto, UpdateProjectDto } from "./projects.dto";
import { ProjectsService } from "./projects.service";
import { MembersService } from "../members/members.service";

@Controller("projects")
export class ProjectsController {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
    private readonly service: ProjectsService,
    private readonly realtime: ProjectRealtimeService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
  ) {}

  @Get()
  list(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
    @CurrentMemberRole() role: MemberRole,
  ) {
    return this.queries
      .execute(
        new ListProjectsQuery(workspaceId, session.memberId, role),
      )
      .then((projects: any[]) =>
        projects.map((project) => {
          const currentMemberRole =
            role === MEMBER_ROLES.owner
              ? MEMBER_ROLES.owner
              : project.memberRoles instanceof Map
                ? project.memberRoles.get(session.memberId)
                : project.memberRoles?.[session.memberId];

          return {
            key: project.key,
            name: project.name,
            color: project.color,
            currentMemberRole: currentMemberRole ?? MEMBER_ROLES.viewer,
          };
        }),
      );
  }

  @Sse("sse")
  @Header("Content-Type", "text/event-stream")
  @Header("Cache-Control", "no-cache, no-transform")
  @Header("Connection", "keep-alive")
  @Header("X-Accel-Buffering", "no")
  sse(@WorkspaceId() workspaceId: string): Observable<MessageEvent> {
    const keepAlive$ = interval(15000).pipe(
      map(() => ({ data: "ping" } as MessageEvent)),
    );

    const realEvents$ = this.service.events$.pipe(
      filter((event) => event.workspaceId === workspaceId),
      map(
        (event) =>
          ({
            data: {
              type: event.type,
              data: { projectKey: event.projectKey },
            },
          }) as MessageEvent,
      ),
    );
    const realtimeEvents$ = this.realtime.events$.pipe(
      filter((event) => event.workspaceId === workspaceId),
      map(
        (event) =>
          ({
            data: {
              type: event.type,
              data: event.data ?? { projectKey: event.projectKey },
            },
          }) as MessageEvent,
      ),
    );

    return merge(realEvents$, realtimeEvents$, keepAlive$);
  }

  @Post("presence")
  presenceHeartbeat(
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
  ) {
    return {
      presence: this.realtime.touchPresence(workspaceId, "", session.memberId),
    };
  }

  @Sse(":key/sse")
  @RequireProjectAccess("key")
  @Header("Content-Type", "text/event-stream")
  @Header("Cache-Control", "no-cache, no-transform")
  @Header("Connection", "keep-alive")
  @Header("X-Accel-Buffering", "no")
  projectSse(
    @Param("key") key: string,
    @WorkspaceId() workspaceId: string,
  ): Observable<MessageEvent> {
    const projectKey = key.toUpperCase();
    const keepAlive$ = interval(15000).pipe(
      map(() => ({ data: "ping" } as MessageEvent)),
    );
    const initial$ = of({
      data: {
        type: "PRESENCE_CHANGED",
        data: {
          presence: this.realtime.getPresenceSnapshot(workspaceId, projectKey),
        },
      },
    } as MessageEvent);
    const realEvents$ = this.realtime.events$.pipe(
      filter(
        (event) =>
          event.workspaceId === workspaceId &&
          event.projectKey.toUpperCase() === projectKey,
      ),
      map((event) => ({ data: { type: event.type, data: event.data } }) as MessageEvent),
    );

    return merge(initial$, realEvents$, keepAlive$);
  }

  @Post(":key/presence")
  @RequireProjectAccess("key")
  presence(
    @Param("key") key: string,
    @WorkspaceId() workspaceId: string,
    @CurrentSession() session: AuthSession,
  ) {
    return {
      presence: this.realtime.touchPresence(
        workspaceId,
        key.toUpperCase(),
        session.memberId,
      ),
    };
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
