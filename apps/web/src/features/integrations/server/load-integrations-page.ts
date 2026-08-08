import "server-only";

import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { redirect } from "next/navigation";
import type {
  DiscordProjectStatus,
  DiscordWorkspaceStatus,
  GithubInstallation,
  GithubRepositoryStatus,
} from "@/features/integrations/types";
import { loadWorkspaceAccess } from "@/features/members/server/load-workspace-access";
import { apiData } from "@/lib/server/api-data";

export async function loadIntegrationsPage() {
  const access = await loadWorkspaceAccess();
  if (access.currentRole !== MEMBER_ROLES.owner) {
    redirect("/workspaces");
  }

  const [github, githubRepositories, discordWorkspace, discordProjects] =
    await Promise.all([
      apiData<GithubInstallation[]>("/integrations/github/status"),
      apiData<GithubRepositoryStatus[]>("/integrations/github/repositories"),
      apiData<DiscordWorkspaceStatus>("/integrations/discord/workspace/status"),
      apiData<DiscordProjectStatus[]>("/integrations/discord/status"),
    ]);

  return {
    github,
    githubRepositories,
    linkedRepositories: githubRepositories.filter((repository) =>
      Boolean(repository.linkedProjectKey),
    ),
    discordWorkspace,
    discordProjects,
  };
}
