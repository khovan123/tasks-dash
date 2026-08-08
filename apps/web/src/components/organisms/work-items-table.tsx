import { WorkItemTypeIcon, WORK_ITEM_TYPE_LABELS } from "@/components/atoms/work-item-type-icon";
import { ExternalLinkList } from "@/components/molecules/external-link-list";
import { MemberInfoBadge } from "@/components/molecules/member-info-badge";
import { ResourceEmptyState } from "@/components/molecules/resource-empty-state";
import { WorkItemStatusBadge } from "@/components/molecules/work-item-status-badge";
import { GithubWorkItemLinks } from "@/components/organisms/github-work-item-links";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  WorkflowStatusView,
  WorkItemMember,
  WorkItemView,
} from "@/features/work-items/types";

export function WorkItemsTable({
  items,
  statuses,
  members,
}: {
  items: WorkItemView[];
  statuses: WorkflowStatusView[];
  members: WorkItemMember[];
}) {
  if (items.length === 0) {
    return (
      <ResourceEmptyState
        title="Chưa có work item"
        description="Tạo Task, Module hoặc Bug bằng nút Tạo công việc ở góc trên."
      />
    );
  }

  const statusMap = new Map(statuses.map((status) => [status.id, status]));
  const membersMap = new Map(members.map((member) => [member.id, member]));

  return (
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
        {items.map((item) => {
          const status = statusMap.get(item.statusId);
          const assignee = item.assigneeId ? membersMap.get(item.assigneeId) : null;
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
                <WorkItemStatusBadge
                  statusId={item.statusId}
                  name={status?.name}
                  color={status?.color}
                />
              </TableCell>
              <TableCell>
                {assignee ? (
                  <MemberInfoBadge
                    memberId={assignee.id}
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
                <ExternalLinkList links={item.figmaLinks} fallbackLabel="Figma" />
              </TableCell>
              <TableCell>
                <ExternalLinkList links={item.documentLinks} fallbackLabel="Doc" />
              </TableCell>
              <TableCell className="whitespace-normal">
                <GithubWorkItemLinks github={item.github} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
