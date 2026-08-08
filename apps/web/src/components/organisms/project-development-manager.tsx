"use client";

import { EnvironmentEditor } from "@/components/organisms/environment-editor";
import { PullRequestPanel } from "@/components/organisms/pull-request-panel";
import type { DevelopmentPullRequest } from "@/features/development/types";

export function ProjectDevelopmentManager({
  projectKey,
  initialPRs,
  initialEnvs,
  canUpdate = false,
  isOwner = false,
}: {
  projectKey: string;
  initialPRs: DevelopmentPullRequest[];
  initialEnvs: Record<string, string>;
  canUpdate?: boolean;
  isOwner?: boolean;
}) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <PullRequestPanel
        projectKey={projectKey}
        initialPullRequests={initialPRs}
        canRefresh={isOwner}
      />
      <EnvironmentEditor
        projectKey={projectKey}
        initialValues={initialEnvs}
        canUpdate={canUpdate}
      />
    </div>
  );
}
