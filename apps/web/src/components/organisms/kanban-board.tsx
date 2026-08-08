"use client";

import type { DragEvent } from "react";
import { useMemo, useState } from "react";
import { KanbanBoardToolbar } from "@/components/organisms/kanban-board-toolbar";
import { WorkItemKanbanCard } from "@/components/organisms/work-item-kanban-card";
import {
  WorkItemDetailDrawer,
  type DetailWorkItem,
} from "@/components/work-item-detail-drawer";
import { useWorkspacePresence } from "@/components/layout/jira-app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  mergeWorkItem,
  useProjectWorkItems,
} from "@/features/work-items/hooks/use-project-work-items";
import type {
  WorkflowStatusView,
  WorkItemMember,
  WorkItemView,
} from "@/features/work-items/types";
import { apiRequest } from "@/lib/api/api-request";

export function KanbanBoard({
  projectKey,
  initialItems,
  statuses,
  members,
  canManageTasks = false,
  canCompleteSprint = false,
}: {
  projectKey: string;
  initialItems: WorkItemView[];
  statuses: WorkflowStatusView[];
  members: WorkItemMember[];
  canManageTasks?: boolean;
  canCompleteSprint?: boolean;
}) {
  const { items, setItems } = useProjectWorkItems(projectKey, initialItems);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<DetailWorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const presenceByMemberId = useWorkspacePresence();

  const membersMap = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  const groupedItems = useMemo(() => {
    const groups: Record<string, WorkItemView[]> = Object.fromEntries(
      statuses.map((status) => [status.id, []]),
    );
    const query = searchQuery.trim().toLowerCase();
    const filtered = items.filter((item) => {
      const matchesSearch =
        !query ||
        item.summary.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query);
      const matchesAssignee =
        selectedAssigneeId === null || item.assigneeId === selectedAssigneeId;
      return matchesSearch && matchesAssignee;
    });

    for (const item of filtered) {
      if (groups[item.statusId]) groups[item.statusId].push(item);
      else if (statuses[0]?.id) groups[statuses[0].id].push(item);
    }
    return groups;
  }, [items, searchQuery, selectedAssigneeId, statuses]);

  function handleItemUpdate(updated: DetailWorkItem) {
    setItems((current) => mergeWorkItem(current, updated));
    setDetailItem(updated);
  }

  async function handleStatusTransition(itemKey: string, nextStatusId: string) {
    const previous = [...items];
    const itemIndex = items.findIndex((item) => item.key === itemKey);
    if (itemIndex < 0 || items[itemIndex].statusId === nextStatusId) return;

    const updated = [...items];
    updated[itemIndex] = { ...updated[itemIndex], statusId: nextStatusId };
    setItems(updated);
    setSaving(true);
    setError(null);

    try {
      await apiRequest(`/api/work-items/${itemKey}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statusId: nextStatusId }),
      });
    } catch (requestError) {
      setItems(previous);
      setError(
        requestError instanceof Error
          ? requestError.message
          : `Không thể chuyển trạng thái cho ${itemKey}.`,
      );
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(event: DragEvent<HTMLElement>, itemKey: string) {
    if (!canManageTasks) return;
    setDraggedKey(itemKey);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemKey);
  }

  function handleDrop(event: DragEvent<HTMLElement>, targetStatusId: string) {
    if (!canManageTasks) return;
    event.preventDefault();
    const itemKey = draggedKey ?? event.dataTransfer.getData("text/plain");
    setDraggedKey(null);
    if (itemKey) void handleStatusTransition(itemKey, targetStatusId);
  }

  return (
    <div className="flex flex-col gap-6 p-1">
      <KanbanBoardToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        members={members}
        selectedAssigneeId={selectedAssigneeId}
        onAssigneeChange={setSelectedAssigneeId}
        presenceByMemberId={presenceByMemberId}
        canCompleteSprint={canCompleteSprint}
      />

      {error ? (
        <Alert variant="destructive" className="max-w-2xl">
          <AlertTitle>Gặp lỗi khi cập nhật</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex select-none gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {statuses.map((status) => {
          const columnItems = groupedItems[status.id] ?? [];
          return (
            <section
              key={status.id}
              className="flex min-h-125 w-72 shrink-0 flex-col rounded-xl border border-t-4 bg-muted/40 p-3"
              style={{ borderTopColor: status.color || "#64748b" }}
              onDragOver={(event) => {
                if (canManageTasks) event.preventDefault();
              }}
              onDrop={(event) => handleDrop(event, status.id)}
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {status.name}
                </span>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {columnItems.length}
                </Badge>
              </header>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {columnItems.map((item) => {
                  const assignee = item.assigneeId ? membersMap.get(item.assigneeId) : null;
                  return (
                    <WorkItemKanbanCard
                      key={item.key}
                      item={item}
                      assignee={assignee}
                      canManage={canManageTasks}
                      dragged={draggedKey === item.key}
                      presence={assignee ? presenceByMemberId[assignee.id] : undefined}
                      onOpen={() => {
                        setDetailItem(item);
                        setDrawerOpen(true);
                      }}
                      onDragStart={(event) => handleDragStart(event, item.key)}
                      onDragEnd={() => setDraggedKey(null)}
                    />
                  );
                })}

                {columnItems.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed py-8 text-xs text-muted-foreground">
                    No items here
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <WorkItemDetailDrawer
        item={detailItem}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        statuses={statuses}
        members={members}
        projectKey={projectKey}
        onUpdate={handleItemUpdate}
        canEdit={canManageTasks}
      />
      <span className="sr-only" aria-live="polite">
        {saving ? "Đang lưu thay đổi" : ""}
      </span>
    </div>
  );
}
