import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import { MemberRole } from "@tasks-dash/contracts";

export const PUBLIC_ROUTE_KEY = "tasks-dash:public-route";
export const REQUIRED_ROLES_KEY = "tasks-dash:required-roles";
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
export const RequireRoles = (...roles: MemberRole[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);

export interface AuthSession {
  userId: string;
  githubId: number;
  login: string;
  name: string;
  avatarUrl: string;
  workspaceId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  authSession?: AuthSession;
  memberRole?: MemberRole;
  rawBody?: Buffer;
}

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthSession => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authSession) {
      throw new Error("Authenticated session is missing from request context.");
    }
    return request.authSession;
  },
);

export const WorkspaceId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authSession) {
      throw new Error("Authenticated session is missing from request context.");
    }
    return request.authSession.workspaceId;
  },
);

export const CurrentMemberRole = createParamDecorator(
  (_data: unknown, context: ExecutionContext): MemberRole => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.memberRole) {
      throw new Error("Member role is missing from request context.");
    }
    return request.memberRole;
  },
);
