import { Bot } from "lucide-react";
import { DiscordWorkspaceConfigForm } from "@/components/organisms/discord-workspace-config-form";
import { DiscordIntegrationCard } from "@/components/organisms/discord-integration-card";
import { GithubIntegrationCard } from "@/components/organisms/github-integration-card";
import { PageHero } from "@/components/organisms/page-hero";
import { AppPage } from "@/components/templates/app-page";
import { loadIntegrationsPage } from "@/features/integrations/server/load-integrations-page";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const context = await loadIntegrationsPage();

  return (
    <AppPage>
      <PageHero
        eyebrow="GitHub + Discord only"
        title="Tích hợp"
        description="GitHub, GitHub App, Discord Bot"
        aside={<Bot className="size-14 text-primary" />}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <GithubIntegrationCard
          installations={context.github}
          linkedRepositories={context.linkedRepositories}
        />
        <DiscordIntegrationCard
          workspace={context.discordWorkspace}
          projects={context.discordProjects}
        />
      </section>

      <DiscordWorkspaceConfigForm status={context.discordWorkspace} />
    </AppPage>
  );
}
