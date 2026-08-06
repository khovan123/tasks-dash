import Link from "next/link";
import { ExternalLink, FileText, Github, Settings } from "lucide-react";
import {
  GithubWorkItemLinks,
  type GithubWorkItemView,
} from "@/components/github-work-item-links";
import {
  RepositoryLinkForm,
  type GithubRepositoryOption,
} from "@/components/repository-link-form";
import { NewWorkItemModal } from "@/components/new-work-item-modal";
import { MemberIdentity } from "@/components/member-identity";
import { apiData } from "@/lib/server/api-data";
import { PriorityIcon } from "@/components/priority-icon";
import {
  AppPage,
  SectionHeading,
} from "@/components/layout/app-shell";
import {
  WorkItemTypeIcon,
  WORK_ITEM_TYPE_LABELS,
} from "@/components/work-item-type-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const dynamic = "force-dynamic";

interface Project {
  key: string;
  name: string;
  description: string;
  repositoryFullName?: string;
  discordDocsChannelId?: string;
  discordDocsChannelName?: string;
}
interface ExternalLinkView {
  label: string;
  url: string;
}
interface WorkItem {
  key: string;
  summary: string;
  type: string;
  statusId: string;
  priority: string;
  assigneeId?: string;
  figmaLinks: ExternalLinkView[];
  documentLinks: ExternalLinkView[];
  github?: GithubWorkItemView;
}
interface WorkflowStatus {
  id: string;
  name: string;
  category: string;
  color?: string;
}
interface Workflow {
  name: string;
  statuses: WorkflowStatus[];
}
interface WorkspaceMember {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

import { ProjectMembersManager } from "@/components/project-members-manager";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectKey: string }>;
}) {
  const { projectKey } = await params;
  const key = projectKey.toUpperCase();
  const [project, items, workflow, membersData, repositories, session] = await Promise.all(
    [
      apiData<Project>(`/projects/${key}`),
      apiData<WorkItem[]>(`/projects/${key}/work-items`),
      apiData<Workflow | null>(`/projects/${key}/workflow`),
      apiData<{ projectMembers: any[]; workspaceMembers: any[] }>(`/projects/${key}/members`),
      apiData<GithubRepositoryOption[]>(
        "/integrations/github/repositories",
      ).catch(() => []),
      apiData<{ email: string }>("/auth/me"),
    ],
  );
  const membersById = Object.fromEntries(
    membersData.workspaceMembers.map((member) => [member._id, member]),
  );
  // Map statusId → { name, color } for fast lookup in table
  const statusMap = Object.fromEntries(
    (workflow?.statuses ?? []).map((s) => [s.id, { name: s.name, color: s.color }]),
  );

  const currentMemberRole =
    membersData.workspaceMembers.find((member) => member.email === session.email)?.role ?? null;
  const canManageRepository = currentMemberRole === "OWNER";
  const canCreateWorkItem = currentMemberRole === "OWNER" || currentMemberRole === "DEV";

  return (
    <AppPage>
      <RepositoryLinkForm
        projectKey={key}
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
                  projectKey={key}
                  statuses={workflow?.statuses ?? []}
                  members={membersData.projectMembers.map((member) => ({
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
          {items.length === 0 ? (
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
                {items.map((item) => (
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
                          {WORK_ITEM_TYPE_LABELS[item.type] ?? WORK_ITEM_TYPE_LABELS[item.type.toUpperCase()] ?? item.type}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const st = statusMap[item.statusId];
                        const label = st?.name ?? item.statusId;
                        const color = st?.color;
                        return color ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                            style={{ background: color }}
                          >
                            {label}
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-[11px]">{label}</Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {item.assigneeId ? (
                        membersById[item.assigneeId] ? (
                          <MemberIdentity
                            name={membersById[item.assigneeId].name}
                            avatarUrl={membersById[item.assigneeId].avatarUrl}
                            email={membersById[item.assigneeId].email}
                            avatarClassName="size-6"
                            textClassName="text-sm"
                          />
                        ) : (
                          "Unknown member"
                        )
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
                      <GithubWorkItemLinks github={item.github} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </AppPage>
  );
}
