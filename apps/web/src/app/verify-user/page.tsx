import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "Verify User | Tasks Dash",
  description: "Linked role verification guidance for Tasks Dash integrations.",
};

export default function VerifyUserPage() {
  return (
    <PublicInfoPage
      eyebrow="Discord Linked Roles"
      title="User Verification For Connected Workspace Access"
      summary="This page is provided for Discord linked-role and integration verification flows. It confirms that Tasks Dash exposes a valid public verification endpoint and requires authenticated workspace membership before any protected integration action is granted."
    >
      <div className="space-y-6 text-sm leading-7 sm:text-base">
        <p>
          Tasks Dash uses GitHub-backed workspace identity and Discord server
          linkage to coordinate access to project automations, pull request
          workflows, deployment status, and security alert handling.
        </p>

        <div className="rounded-3xl border border-border bg-card/70 p-5">
          <h2 className="mb-2 text-xl font-bold text-foreground">
            Verification Rules
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>Users must authenticate through the Tasks Dash workspace.</li>
            <li>Workspace membership is required for protected integrations.</li>
            <li>Discord-linked actions are validated server-side.</li>
            <li>GitHub and Discord actions are audited through the backend.</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 p-5">
          <h2 className="mb-2 text-xl font-bold text-foreground">
            Support
          </h2>
          <p className="text-muted-foreground">
            If Discord role verification or linked-role behavior fails, contact
            the workspace owner or the team operating this Tasks Dash
            deployment.
          </p>
        </div>
      </div>
    </PublicInfoPage>
  );
}
