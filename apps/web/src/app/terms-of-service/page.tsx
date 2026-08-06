import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Terms of Service | Tasks Dash",
  description: "Terms of Service for Tasks Dash integrations and workspace usage.",
};

export default function TermsOfServicePage() {
  return (
    <PublicInfoPage
      eyebrow="Legal"
      title="Terms of Service"
      summary="These terms govern the use of Tasks Dash, including GitHub App integrations, Discord bot workflows, project collaboration, and automated notifications."
    >
      <div className="space-y-6 text-sm leading-7 sm:text-base">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">1. Service Use</h2>
          <p className="text-muted-foreground">
            Tasks Dash is provided for workspace coordination, project delivery,
            GitHub automation, Discord collaboration, and related operational
            workflows. You may only use the service for authorized team and
            business activity.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            2. Account Responsibility
          </h2>
          <p className="text-muted-foreground">
            Each user is responsible for actions taken through their workspace
            account, GitHub identity, and Discord-linked interactions. Do not
            share access credentials or attempt to bypass permission checks.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            3. Integrations And Automation
          </h2>
          <p className="text-muted-foreground">
            GitHub and Discord automations act on the permissions granted to the
            configured integrations. Workspace owners are responsible for
            reviewing installation scope, repository access, bot membership, and
            command permissions before enabling production use.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">4. Acceptable Use</h2>
          <p className="text-muted-foreground">
            You may not use Tasks Dash to disrupt repositories, abuse third-party
            APIs, send spam, or perform unauthorized actions against source code,
            deployments, security alerts, or team communication channels.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">5. Availability</h2>
          <p className="text-muted-foreground">
            The service may change, be updated, or be interrupted without prior
            notice. Automations depend on third-party services including GitHub
            and Discord, which may impose their own availability, rate limits,
            and restrictions.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
