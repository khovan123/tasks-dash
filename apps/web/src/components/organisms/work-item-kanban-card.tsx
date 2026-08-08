import type { DragEvent } from "react";
import { WorkItemTypeIcon, WORK_ITEM_TYPE_LABELS } from "@/components/atoms/work-item-type-icon";
import { PriorityIcon } from "@/components/atoms/priority-icon";
import { GithubWorkItemLinks } from "@/components/github-work-item-links";
import { WorkItemAssigneeAvatar } from "@/components/molecules/work-item-assignee-avatar";
import { WorkItemDueIndicator } from "@/components/molecules/work-item-due-indicator";
import { WorkItemLabels } from "@/components/molecules/work-item-labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getWorkItemDueState } from "@/features/work-items/lib/due-state";
import type { WorkItemMember, WorkItemView } from "@/features/work-items/types";
import { cn } from "@/lib/utils";

export function WorkItemKanbanCard({
  item,
  assignee,
  canManage,
  dragged,
  presence,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  item: WorkItemView;
  assignee?: WorkItemMember | null;
  canManage: boolean;
  dragged: boolean;
  presence?: string;
  onOpen: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
}) {
  const { isOverdue, isDueSoon } = getWorkItemDueState(item.dueDate);

  return (
    <Card
      className={cn(
        "border bg-card transition hover:shadow-sm",
        canManage
          ? "cursor-pointer active:cursor-grabbing hover:border-primary/45"
          : "cursor-default",
        isOverdue
          ? "border-destructive/70 hover:border-destructive"
          : isDueSoon
            ? "border-warning/70 hover:border-warning"
            : "",
        dragged && "opacity-40",
      )}
      draggable={canManage}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <CardContent className="flex flex-col gap-3 p-3.5">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs font-bold text-muted-foreground">{item.key}</span>
          <p className="text-sm font-medium leading-snug text-foreground">{item.summary}</p>
        </div>

        <WorkItemLabels labels={item.labels} />

        <div className="flex items-center justify-between border-t border-border/50 pt-1 text-xs">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span title={WORK_ITEM_TYPE_LABELS[item.type] ?? item.type}>
              <WorkItemTypeIcon type={item.type} size={14} />
            </span>
            <span title={`Priority: ${item.priority}`}>
              <PriorityIcon priority={item.priority} className="size-3.5" />
            </span>
            {item.github ? (
              <span onClick={(event) => event.stopPropagation()}>
                <GithubWorkItemLinks github={item.github} compact />
              </span>
            ) : null}
            <WorkItemDueIndicator dueDate={item.dueDate} variant="compact" />
            {item.storyPoints !== undefined ? (
              <Badge className="h-4 border bg-muted px-1.5 text-[9px] text-muted-foreground hover:bg-muted">
                {item.storyPoints}
              </Badge>
            ) : null}
          </div>
          <WorkItemAssigneeAvatar
            member={assignee}
            presence={presence}
            showUnassigned
          />
        </div>
      </CardContent>
    </Card>
  );
}
