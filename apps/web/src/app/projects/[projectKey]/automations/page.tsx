import { MEMBER_ROLES } from "@tasks-dash/contracts";
import { AutomationCreateForm } from "@/components/automation-create-form";
import {
  AutomationRuleManager,
  type AutomationRule,
} from "@/components/automation-rule-manager";
import { SectionHeading } from "@/components/molecules/section-heading";
import { AppPage } from "@/components/templates/app-page";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  hasWorkspaceRole,
  loadWorkspaceAccess,
} from "@/features/members/server/load-workspace-access";
import { apiProjectResponse } from "@/lib/server/project-access";

export const dynamic = "force-dynamic";

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [access, rulesResponse] = await Promise.all([
    loadWorkspaceAccess(),
    apiProjectResponse(`/projects/${key}/automations`),
  ]);
  const canManage = hasWorkspaceRole(access.currentRole, [MEMBER_ROLES.owner]);

  const rulesPayload = (await rulesResponse.json().catch(() => null)) as
    | { ok: true; data: AutomationRule[] }
    | null;
  if (!rulesResponse.ok || !rulesPayload || rulesPayload.ok !== true) {
    throw new Error(`API request failed with HTTP ${rulesResponse.status}.`);
  }
  const rules = rulesPayload.data;

  return (
    <AppPage>
      <Card>
        <CardHeader>
          <SectionHeading
            eyebrow="Automation rules"
            title="Rules hiện tại"
            meta={`${rules.length} rules`}
          />
        </CardHeader>
        <CardContent>
          <AutomationRuleManager
            projectKey={key}
            initialRules={rules}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      {canManage ? <AutomationCreateForm projectKey={key} /> : null}
    </AppPage>
  );
}
