import "server-only";

import type { MemberRole } from "@tasks-dash/contracts";
import type { WorkspaceMembersResponse } from "@/features/members/types";
import { apiData } from "@/lib/server/api-data";

export async function loadWorkspaceAccess() {
  const [workspaceMembers, session] = await Promise.all([
    apiData<WorkspaceMembersResponse>("/workspace/members"),
    apiData<{ email: string }>("/auth/me"),
  ]);
  const currentMember = workspaceMembers.members.find(
    (member) => member.email === session.email,
  );

  return {
    workspaceMembers,
    session,
    currentMember,
    currentRole: currentMember?.role ?? null,
  };
}

export function hasWorkspaceRole(
  currentRole: MemberRole | null,
  allowedRoles: readonly MemberRole[],
): boolean {
  return currentRole !== null && allowedRoles.includes(currentRole);
}
