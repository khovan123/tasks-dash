"use client";

import { useEffect, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import {
  GithubWorkItemLinks,
  type GithubWorkItemView,
} from "@/components/github-work-item-links";
import {
  RepositoryLinkForm,
  type GithubRepositoryOption,
} from "@/components/repository-link-form";
import { NewWorkItemModal } from "@/components/new-work-item-modal";
import { MemberInfoBadge } from "@/components/member-info-badge";
import { PriorityIcon } from "@/components/priority-icon";
import { SectionHeading } from "@/components/layout/app-shell";
import {
  WorkItemTypeIcon,
  WORK_ITEM_TYPE_LABELS,
} from "@/components/work-item-type-icon";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  replaceWorkItems,
  selectProject,
  selectWorkItemsByProject,
  upsertProjectDetail,
  type RealtimeProject,
  type RealtimeWorkItem,
} from "@/lib/store/realtime-slice";

interface WorkflowStatus {
  id: string;
  name: string;
  category: string;
  color?: string;
}

interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  githubLogin?: string;
  discordUsername?: string;
}

export function ProjectOverviewRealtime({
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
  initialItems: RealtimeWorkItem[];
  statuses: WorkflowStatus[];
  projectMembers: WorkspaceMember[];
  workspaceMembers: WorkspaceMember[];
  repositories: GithubRepositoryOption[];
  canManageRepository: boolean;
  canCreateWorkItem: boolean;
}) {
  const dispatch = useAppDispatch();
  const project = useAppSelector(selectProject(projectKey)) ?? initialProject;
  const workItemsSelector = useMemo(
    () => selectWorkItemsByProject(projectKey),
    [projectKey],
  );
  const items = useAppSelector(workItemsSelector);

  useEffect(() => {
    dispatch(upsertProjectDetail(initialProject));
    dispatch(
      replaceWorkItems({
        projectKey,
        items: initialItems,
        bumpRevision: false,
      }),
    );
  }, [dispatch, initialItems, initialProject, projectKey]);

  const membersById = useMemo(
    () => Object.fromEntries(workspaceMembers.map((member) => [member._id, member])),
    [workspaceMembers],
  );
  const statusMap = useMemo(
    () =>
      Object.fromEntries(
        statuses.map((status) => [
          status.id,
          { name: status.name, color: status.color },
        ]),
      ),
    [statuses],
  );

  const renderedItems = items.length || initialItems.length === 0 ? items : initialItems;

  return (
    <>
      <RepositoryLinkForm
        projectKey={projectKey}
        currentRepositoryFullName={project.repositoryFullName as string | undefined}
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
                  members={projectMembers.map((member) => ({
                    id: member._id,
                    name: member.name,
                    email: member.email,
                  }))}
                />
              ) : null
            }
          />
        </CardHeader>
        <CardContent>
          {renderedItems.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Chưa có work item</EmptyTitle>
                <EmptyDescription>
                  Tạo Task, Module hoặc Bug bằng nút Tạo công việc ở góc trên.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Figma</TableHead>
                  <TableHead>Docs</TableHead>
                  <TableHead>GitHub</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderedItems.map((item) => {
                  const status = statusMap[item.statusId];
                  const assignee = item.assigneeId
                    ? membersById[item.assigneeId]
                    : null;
                  return (
                    <TableRow key={item.key}>
                      <TableCell>
                        <Badge variant="purple">{item.key}</Badge>
                      </TableCell>
                      <TableCell className="min-w-56 whitespace-normal font-medium">
                        {item.summary}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <WorkItemTypeIcon type={item.type} size={14} />
                          <span className="text-xs capitalize">
                            {WORK_ITEM_TYPE_LABELS[item.type] ??
                              WORK_ITEM_TYPE_LABELS[item.type.toUpperCase()] ??
                              item.type}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        {status?.color ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                            style={{ background: status.color }}
                          >
                            {status.name}
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">
                            {status?.name ?? item.statusId}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {assignee ? (
                          <MemberInfoBadge
                            memberId={item.assigneeId!}
                            name={assignee.name}
                            avatarUrl={assignee.avatarUrl}
                            email={assignee.email}
                            githubLogin={assignee.githubLogin}
                            discordUsername={assignee.discordUsername}
                            avatarClassName="size-6"
                            textClassName="text-sm"
                          />
                        ) : item.assigneeId ? (
                          "Unknown member"
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.figmaLinks?.length ? (
                          <div className="grid gap-1">
                            {item.figmaLinks.map((link, index) => (
                              <a
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                                key={`${link.url}-${index}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="size-3" />{" "}
                                {link.label || `Figma ${index + 1}`}
                              </a>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {item.documentLinks?.length ? (
                          <div className="grid gap-1">
                            {item.documentLinks.map((link, index) => (
                              <a
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                                key={`${link.url}-${index}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <ExternalLink className="size-3" />{" "}
                                {link.label || `Doc ${index + 1}`}
                              </a>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <GithubWorkItemLinks github={item.github as GithubWorkItemView | undefined} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
