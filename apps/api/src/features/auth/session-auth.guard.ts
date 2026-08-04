import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
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
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
} from "../../common/auth-context";
import {
  MemberDocument,
  MemberHydratedDocument,
} from "../members/member.schema";
import { SessionService } from "./session.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
    @InjectModel(MemberDocument.name)
    private readonly members: Model<MemberHydratedDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & AuthenticatedRequest>();
    const session = this.sessions.read(request);
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())) {
      const expectedOrigin = new URL(
        this.config.getOrThrow<string>("WEB_APP_URL"),
      ).origin;
      if (request.headers.origin !== expectedOrigin) {
        throw new ForbiddenException("Invalid request origin.");
      }
    }
    const member = await this.members
      .findOne({ _id: session.userId, workspaceId: session.workspaceId })
      .select({ role: 1 })
      .lean()
      .exec();
    if (!member) {
      throw new UnauthorizedException(
        "Workspace membership is no longer active.",
      );
    }
    const configuredRoles = this.reflector.getAllAndOverride<MemberRole[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredRoles =
      configuredRoles ??
      (["POST", "PUT", "PATCH", "DELETE"].includes(
        request.method.toUpperCase(),
      )
        ? [
            MEMBER_ROLES.owner,
            MEMBER_ROLES.admin,
            MEMBER_ROLES.projectLead,
            MEMBER_ROLES.member,
          ]
        : undefined);
    if (requiredRoles?.length && !requiredRoles.includes(member.role)) {
      throw new ForbiddenException(
        "This workspace role cannot perform the requested action.",
      );
    }
    request.authSession = session;
    request.memberRole = member.role;
    request.headers["x-workspace-id"] = session.workspaceId;
    return true;
  }
}
