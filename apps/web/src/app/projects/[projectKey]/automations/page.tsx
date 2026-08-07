import { apiData, apiResponse } from "@/lib/server/api-data";
import { apiProjectResponse } from "@/lib/server/project-access";
import { AutomationCreateForm } from "@/components/automation-create-form";
import {
  AutomationRuleManager,
  type AutomationRule,
} from "@/components/automation-rule-manager";
import {
  AppPage,
  SectionHeading,
} from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MEMBER_ROLES, type MemberRole } from "@tasks-dash/contracts";
import type { JiraShellSession } from "@/components/layout/jira-app-shell";

export const dynamic = "force-dynamic";

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: MemberRole;
  status: string;
}

interface WorkspaceMembersResponse {
  workspace: { workspaceId: string; name: string; slug?: string };
  members: WorkspaceMember[];
}

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();

  const [workspaceMembers, session, rulesResponse] = await Promise.all([
    apiData<WorkspaceMembersResponse>("/workspace/members"),
    apiData<JiraShellSession>("/auth/me"),
    apiProjectResponse(`/projects/${key}/automations`),
  ]);

  const canManage =
    workspaceMembers.members.find((member) => member.email === session.email)
      ?.role === MEMBER_ROLES.owner;

  const rulesPayload = (await rulesResponse.json().catch(() => null)) as
    | { ok: true; data: AutomationRule[] }
    | null;
  if (!rulesResponse.ok || !rulesPayload || rulesPayload.ok !== true) {
    throw new Error(
      `API request failed with HTTP ${rulesResponse.status}.`,
    );
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

      {canManage && <AutomationCreateForm projectKey={key} />}
    </AppPage>
  );
}
