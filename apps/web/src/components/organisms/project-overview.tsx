"use client";

import { useMemo } from "react";
import { NewWorkItemModal } from "@/components/new-work-item-modal";
import {
  RepositoryLinkForm,
  type GithubRepositoryOption,
} from "@/components/repository-link-form";
import { SectionHeading } from "@/components/molecules/section-heading";
import { WorkItemsTable } from "@/components/organisms/work-items-table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useRealtimeProject } from "@/features/projects/hooks/use-realtime-project";
import { useProjectWorkItems } from "@/features/work-items/hooks/use-project-work-items";
import type {
  WorkflowStatusView,
  WorkItemMember,
  WorkItemView,
} from "@/features/work-items/types";
import type { RealtimeProject } from "@/lib/store/realtime-slice";

export function ProjectOverview({
  projectKey,
  initialProject,
  initialItems,
  statuses,
  projectMembers,
  workspaceMembers,
  repositories,
  canManageRepository,
  canCreateWorkItem,
}: {
  projectKey: string;
  initialProject: RealtimeProject;
  initialItems: WorkItemView[];
  statuses: WorkflowStatusView[];
  projectMembers: WorkItemMember[];
  workspaceMembers: WorkItemMember[];
  repositories: GithubRepositoryOption[];
  canManageRepository: boolean;
  canCreateWorkItem: boolean;
}) {
  const project = useRealtimeProject(projectKey, initialProject);
  const { items } = useProjectWorkItems(projectKey, initialItems);
  const membersForTable = useMemo(
    () => (workspaceMembers.length > 0 ? workspaceMembers : projectMembers),
    [projectMembers, workspaceMembers],
  );

  return (
    <>
      <RepositoryLinkForm
        projectKey={projectKey}
        currentRepositoryFullName={project.repositoryFullName}
        repositories={repositories}
        canManage={canManageRepository}
      />

      <Card>
        <CardHeader>
          <SectionHeading
            title="Work items"
            meta={
              canCreateWorkItem ? (
                <NewWorkItemModal
                  projectKey={projectKey}
                  statuses={statuses}
                  members={projectMembers}
                />
              ) : null
            }
          />
        </CardHeader>
        <CardContent>
          <WorkItemsTable
            items={items}
            statuses={statuses}
            members={membersForTable}
          />
        </CardContent>
      </Card>
    </>
  );
}
