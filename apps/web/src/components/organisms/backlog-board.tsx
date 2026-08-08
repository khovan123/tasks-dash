"use client";

import type { DragEvent } from "react";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { NewWorkItemModal } from "@/components/new-work-item-modal";
import { WorkItemBacklogRow } from "@/components/organisms/work-item-backlog-row";
import {
  WorkItemDetailDrawer,
  type DetailWorkItem,
} from "@/components/work-item-detail-drawer";
import { SectionHeading } from "@/components/molecules/section-heading";
import { useWorkspacePresence } from "@/components/layout/jira-app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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

export function BacklogBoard({
  projectKey,
  initialItems,
  statusNames,
  statuses,
  members,
  canManageTasks = false,
}: {
  projectKey: string;
  initialItems: WorkItemView[];
  statusNames: Record<string, string>;
  statuses: WorkflowStatusView[];
  members: WorkItemMember[];
  canManageTasks?: boolean;
}) {
  const membersMap = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );
  const { items, setItems } = useProjectWorkItems(projectKey, initialItems);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<DetailWorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const presenceByMemberId = useWorkspacePresence();

  function handleItemUpdate(updated: DetailWorkItem) {
    setItems((current) => mergeWorkItem(current, updated));
    setDetailItem(updated);
  }

  async function persist(nextItems: WorkItemView[], previous: WorkItemView[]) {
    setItems(nextItems);
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/api/projects/${projectKey}/work-items/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ orderedKeys: nextItems.map((item) => item.key) }),
      });
    } catch (requestError) {
      setItems(previous);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể lưu thứ tự backlog.",
      );
    } finally {
      setSaving(false);
    }
  }

  function move(sourceKey: string, targetIndex: number): void {
    const sourceIndex = items.findIndex((item) => item.key === sourceKey);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;
    const previous = [...items];
    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void persist(next, previous);
  }

  function drop(event: DragEvent<HTMLElement>, targetIndex: number): void {
    event.preventDefault();
    const sourceKey = draggedKey ?? event.dataTransfer.getData("text/plain");
    setDraggedKey(null);
    if (sourceKey) move(sourceKey, targetIndex);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <SectionHeading
            title="Backlog"
            meta={
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {saving ? "Đang lưu…" : `${items.length} items`}
                </span>
                {canManageTasks ? (
                  <NewWorkItemModal projectKey={projectKey} statuses={statuses} members={members} />
                ) : null}
              </div>
            }
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Không thể lưu thứ tự</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Backlog đang trống</EmptyTitle>
                <EmptyDescription>Tạo work item trong project overview trước.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-2">
              {items.map((item, index) => {
                const assignee = item.assigneeId ? membersMap.get(item.assigneeId) : null;
                return (
                  <WorkItemBacklogRow
                    key={item.key}
                    item={item}
                    assignee={assignee}
                    statusLabel={statusNames[item.statusId] ?? item.statusId}
                    canManage={canManageTasks}
                    dragged={draggedKey === item.key}
                    presence={assignee ? presenceByMemberId[assignee.id] : undefined}
                    onOpen={() => {
                      setDetailItem(item);
                      setDrawerOpen(true);
                    }}
                    onDragStart={(event) => {
                      if (!canManageTasks) return;
                      setDraggedKey(item.key);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.key);
                    }}
                    onDragEnd={() => setDraggedKey(null)}
                    onDragOver={(event) => {
                      if (canManageTasks) event.preventDefault();
                    }}
                    onDrop={(event) => {
                      if (canManageTasks) drop(event, index);
                    }}
                  />
                );
              })}

              {canManageTasks ? (
                <div className="mt-3 flex justify-center border-t pt-3">
                  <NewWorkItemModal
                    projectKey={projectKey}
                    statuses={statuses}
                    members={members}
                    trigger={
                      <Button variant="outline" size="sm" className="w-full max-w-xs gap-2">
                        <Plus className="size-4" />
                        Tạo công việc mới
                      </Button>
                    }
                  />
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

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
    </>
  );
}
