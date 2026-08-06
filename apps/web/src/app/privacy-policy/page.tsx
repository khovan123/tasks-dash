import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Tasks Dash",
  description: "Privacy Policy for Tasks Dash integrations and workspace data handling.",
};

export default function PrivacyPolicyPage() {
  return (
    <PublicInfoPage
      eyebrow="Legal"
      title="Privacy Policy"
      summary="This policy describes how Tasks Dash handles workspace identity, integration metadata, repository linkage, and automation-related information."
    >
      <div className="space-y-6 text-sm leading-7 sm:text-base">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            1. Data We Process
          </h2>
          <p className="text-muted-foreground">
            Tasks Dash may process workspace profile data, project membership,
            repository linkage, Discord guild and channel metadata, GitHub App
            installation metadata, webhook payload fragments, and audit-related
            event details required to operate integrations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            2. Why We Process Data
          </h2>
          <p className="text-muted-foreground">
            Data is processed to authenticate users, connect workspaces to
            GitHub and Discord, provision project channels, execute slash
            commands, surface repository activity, and manage automation
            workflows such as pull requests, deployments, and security alerts.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            3. Third-Party Services
          </h2>
          <p className="text-muted-foreground">
            Tasks Dash depends on third-party platforms including GitHub and
            Discord. Data shared with those services is also governed by their
            own privacy and platform policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            4. Access And Retention
          </h2>
          <p className="text-muted-foreground">
            Access to integration data is limited by workspace membership and
            role checks enforced by the application backend. Operational records
            may be retained for auditing, troubleshooting, and service integrity
            purposes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-foreground">
            5. Contact
          </h2>
          <p className="text-muted-foreground">
            For privacy-related questions, contact the owner or operator of the
            Tasks Dash deployment where your workspace is hosted.
          </p>
        </section>
      </div>
    </PublicInfoPage>
  );
}
