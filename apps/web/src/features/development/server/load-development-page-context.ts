import "server-only";

import { MEMBER_ROLES } from "@tasks-dash/contracts";
import type {
  DevelopmentMembersResponse,
  DevelopmentPageContext,
  DevelopmentPullRequest,
} from "@/features/development/types";
import { apiProjectResponse } from "@/lib/server/project-access";

async function readPayload<T>(response: Response, fallback: T): Promise<T> {
  const payload = await response.json().catch(() => null);
  return payload?.ok ? (payload.data as T) : fallback;
}

export async function loadDevelopmentPageContext(
  projectKey: string,
): Promise<DevelopmentPageContext> {
  const key = projectKey.toUpperCase();
  const [prsResponse, envResponse, membersResponse, sessionResponse] =
    await Promise.all([
      apiProjectResponse(`/projects/${key}/development/pull-requests`),
      apiProjectResponse(`/projects/${key}/env`),
      apiProjectResponse(`/projects/${key}/members`),
      apiProjectResponse("/auth/me"),
    ]);

  const [pullRequests, env, members, session] = await Promise.all([
    readPayload<DevelopmentPullRequest[]>(prsResponse, []),
    readPayload<Record<string, string>>(envResponse, {}),
    readPayload<DevelopmentMembersResponse>(membersResponse, {
      projectMembers: [],
      workspaceMembers: [],
    }),
    readPayload<{ email?: string }>(sessionResponse, {}),
  ]);

  const currentWorkspaceMember = members.workspaceMembers.find(
    (member) => member.email === session.email,
  );
  const currentProjectMember = members.projectMembers.find(
    (member) => member.email === session.email,
  );
  const isOwner =
    currentWorkspaceMember?.role === MEMBER_ROLES.owner ||
    currentProjectMember?.role === MEMBER_ROLES.owner;

  return {
    key,
    pullRequests,
    env,
    isOwner,
    canUpdate: isOwner || currentProjectMember?.role === MEMBER_ROLES.dev,
  };
}
