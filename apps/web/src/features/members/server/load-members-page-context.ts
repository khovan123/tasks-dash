import "server-only";

import { MEMBER_ROLES } from "@tasks-dash/contracts";
import type {
  MemberProjectSummary,
  ProjectMembersResponse,
} from "@/features/members/types";
import { apiData } from "@/lib/server/api-data";
import { apiProjectData } from "@/lib/server/project-access";
import {
  hasWorkspaceRole,
  loadWorkspaceAccess,
} from "./load-workspace-access";

export async function loadWorkspaceMembersPageContext() {
  const [access, projects] = await Promise.all([
    loadWorkspaceAccess(),
    apiData<MemberProjectSummary[]>("/projects"),
  ]);

  return {
    members: access.workspaceMembers.members,
    invitations: access.workspaceMembers.invitations ?? [],
    projects,
    currentRole: access.currentRole,
    canManage: hasWorkspaceRole(access.currentRole, [MEMBER_ROLES.owner]),
  };
}

export async function loadProjectMembersPageContext(projectKey: string) {
  const key = projectKey.toUpperCase();
  const [project, membersData, access] = await Promise.all([
    apiProjectData<MemberProjectSummary>(`/projects/${key}`),
    apiProjectData<ProjectMembersResponse>(`/projects/${key}/members`),
    loadWorkspaceAccess(),
  ]);

  if (!project._id) {
    throw new Error(`Project ${key} is missing its identifier.`);
  }

  return {
    key,
    project,
    projectId: project._id,
    projectMembers: membersData.projectMembers,
    workspaceMembers: membersData.workspaceMembers,
    invitations: access.workspaceMembers.invitations ?? [],
    currentRole: access.currentRole,
    canManage: hasWorkspaceRole(access.currentRole, [MEMBER_ROLES.owner]),
  };
}
