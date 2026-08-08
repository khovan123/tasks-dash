import type { DragEvent } from "react";
import { WorkItemTypeIcon } from "@/components/atoms/work-item-type-icon";
import { PriorityIcon } from "@/components/atoms/priority-icon";
import { GithubWorkItemLinks } from "@/components/github-work-item-links";
import { WorkItemAssigneeAvatar } from "@/components/molecules/work-item-assignee-avatar";
import { WorkItemDueIndicator } from "@/components/molecules/work-item-due-indicator";
import { Badge } from "@/components/ui/badge";
import { getWorkItemDueState } from "@/features/work-items/lib/due-state";
import type { WorkItemMember, WorkItemView } from "@/features/work-items/types";
import { cn } from "@/lib/utils";

export interface WorkItemBacklogRowProps {
  item: WorkItemView;
  assignee?: WorkItemMember | null;
  statusLabel: string;
  canManage: boolean;
  dragged: boolean;
  presence?: string;
  onOpen: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export function WorkItemBacklogRow(props: WorkItemBacklogRowProps) {
  const { item, assignee, statusLabel, canManage, dragged, presence } = props;
  const { isOverdue, isDueSoon } = getWorkItemDueState(item.dueDate);

  return (
    <article
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card p-3 transition",
        canManage ? "cursor-pointer active:cursor-grabbing hover:bg-muted/20" : "cursor-default",
        isOverdue
          ? "border-destructive/70 hover:border-destructive"
          : isDueSoon
            ? "border-warning/70 hover:border-warning"
            : "hover:border-primary/30",
        dragged && "opacity-50",
      )}
      onClick={props.onOpen}
      draggable={canManage}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      onDragOver={props.onDragOver}
      onDrop={props.onDrop}
    >
      <div
        className={cn(
          "rounded p-1 transition",
          canManage ? "cursor-grab active:cursor-grabbing hover:bg-muted" : "cursor-default opacity-50",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <WorkItemTypeIcon type={item.type} size={18} />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate">{item.key} · {item.summary}</strong>
          <Badge variant="outline" className="gap-1.5 capitalize">
            <PriorityIcon priority={item.priority} className="size-3 shrink-0" />
            {item.priority}
          </Badge>
          <Badge variant="info">{statusLabel}</Badge>
          <WorkItemDueIndicator dueDate={item.dueDate} />
        </div>
        <div onClick={(event) => event.stopPropagation()}>
          <GithubWorkItemLinks github={item.github} compact />
        </div>
      </div>
      <div className="flex items-center justify-end">
        <WorkItemAssigneeAvatar member={assignee} presence={presence} size="md" />
      </div>
    </article>
  );
}
