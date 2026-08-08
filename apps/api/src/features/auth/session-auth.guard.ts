import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { Request } from "express";
import { MemberRole, MEMBER_ROLES } from "@tasks-dash/contracts";
import {
  AuthenticatedRequest,
  PROJECT_ACCESS_KEY,
  ProjectAccessRequirement,
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
} from "../../common/auth-context";
import {
  MemberDocument,
  MemberHydratedDocument,
} from "../members/member.schema";
import {
  ProjectDocument,
  ProjectHydratedDocument,
} from "../projects/project.schema";
import {
  WorkItemDocument,
  WorkItemHydratedDocument,
} from "../work-items/work-item.schema";
import { SessionService } from "./session.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberHydratedDocument>,
    @InjectModel(ProjectDocument.name)
    private readonly projects: Model<ProjectHydratedDocument>,
    @InjectModel(WorkItemDocument.name)
    private readonly workItems: Model<WorkItemHydratedDocument>,
  ) {}

  private canAccessProject(
    project: Pick<ProjectDocument, "memberIds" | "leadId">,
    memberId: string,
  ): boolean {
    return (
      project.memberIds.includes(memberId) ||
      (project.leadId !== undefined && project.leadId === memberId)
    );
  }

  private async resolveProjectForAccess(
    workspaceId: string,
    requirement: ProjectAccessRequirement,
    request: Request & AuthenticatedRequest,
  ): Promise<
    Pick<ProjectDocument, "memberIds" | "leadId"> & {
      memberRoles?: Record<string, string>;
    }
  > {
    const paramValue = request.params[requirement.param];
    const rawParam =
      typeof paramValue === "string" ? paramValue : paramValue?.[0];
    if (!rawParam) {
      throw new ForbiddenException("Project access could not be resolved.");
    }

    if (requirement.kind === "project") {
      const project = await this.projects
        .findOne({ workspaceId, key: rawParam.toUpperCase() })
        .select({ memberIds: 1, leadId: 1, memberRoles: 1 })
        .lean()
        .exec();
      if (!project) {
        throw new NotFoundException(`Project ${rawParam} was not found.`);
      }
      return project;
    }

    const workItem = await this.workItems
      .findOne({ workspaceId, key: rawParam.toUpperCase() })
      .select({ projectKey: 1 })
      .lean()
      .exec();
    if (!workItem) {
      throw new NotFoundException(`Work item ${rawParam} was not found.`);
    }
    const project = await this.projects
      .findOne({ workspaceId, key: workItem.projectKey })
      .select({ memberIds: 1, leadId: 1, memberRoles: 1 })
      .lean()
      .exec();
    if (!project) {
      throw new NotFoundException(
        `Project ${workItem.projectKey} was not found.`,
      );
    }
    return project;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & AuthenticatedRequest>();
    const session = this.sessions.read(request);
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())
    ) {
      const expectedOrigin = new URL(
        this.config.getOrThrow<string>("WEB_APP_URL"),
      ).origin;
      const protocol =
        request.headers["x-forwarded-proto"] === "https" || request.secure
          ? "https"
          : "http";
      const host = request.headers["x-forwarded-host"] || request.headers.host;
      const selfOrigin = host ? `${protocol}://${host}` : null;

      if (
        request.headers.origin !== expectedOrigin &&
        (!selfOrigin || request.headers.origin !== selfOrigin)
      ) {
        throw new ForbiddenException("Invalid request origin.");
      }
    }
    const member = await this.members
      .findOne({
        _id: session.memberId,
        workspaceId: session.workspaceId,
        authIdentityId: session.identityId,
      })
      .select({ role: 1 })
      .lean()
      .exec();
    if (!member) {
      throw new UnauthorizedException(
        "Workspace membership is no longer active.",
      );
    }

    const projectAccess = this.reflector.getAllAndOverride<
      ProjectAccessRequirement | undefined
    >(PROJECT_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    let effectiveRole = member.role;

    if (projectAccess) {
      const project = await this.resolveProjectForAccess(
        session.workspaceId,
        projectAccess,
        request,
      );
      if (member.role !== MEMBER_ROLES.owner) {
        if (!this.canAccessProject(project, session.memberId)) {
          throw new ForbiddenException(
            "This workspace member is not assigned to the requested project.",
          );
        }
      }
      const projectRole =
        project.memberRoles instanceof Map
          ? project.memberRoles.get(session.memberId)
          : (project.memberRoles as any)?.[session.memberId];
      if (projectRole && member.role !== MEMBER_ROLES.owner) {
        effectiveRole = projectRole as MemberRole;
      }
    }

    const configuredRoles = this.reflector.getAllAndOverride<MemberRole[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredRoles =
      configuredRoles ??
      (["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())
        ? [
            MEMBER_ROLES.owner,
            MEMBER_ROLES.designer,
            MEMBER_ROLES.ba,
            MEMBER_ROLES.dev,
          ]
        : undefined);
    if (requiredRoles?.length && !requiredRoles.includes(effectiveRole)) {
      throw new ForbiddenException(
        "This workspace role cannot perform the requested action.",
      );
    }

    request.authSession = session;
    request.memberRole = effectiveRole;
    request.headers["x-workspace-id"] = session.workspaceId;
    return true;
  }
}
