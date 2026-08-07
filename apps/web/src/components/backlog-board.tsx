"use client";

import { useRouter } from "next/navigation";
import type { DragEvent } from "react";
import { useState, useEffect } from "react";
import { Clock, Calendar, AlertCircle, Plus } from "lucide-react";
import {
  WorkItemTypeIcon,
  WORK_ITEM_TYPE_LABELS,
} from "@/components/work-item-type-icon";
import {
  GithubWorkItemLinks,
  type GithubWorkItemView,
} from "@/components/github-work-item-links";
import { apiRequest } from "@/lib/api/api-request";
import { PriorityIcon } from "@/components/priority-icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { SectionHeading } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";

import { NewWorkItemModal } from "@/components/new-work-item-modal";

import {
  WorkItemDetailDrawer,
  type DetailWorkItem,
} from "@/components/work-item-detail-drawer";

interface BacklogItem {
  key: string;
  summary: string;
  type: string;
  priority: string;
  statusId: string;
  rank: number;
  dueDate?: string;
  startDate?: string;
  description?: string;
  storyPoints?: number;
  assigneeId?: string;
  labels?: string[];
  figmaLinks?: { label: string; url: string }[];
  documentLinks?: { label: string; url: string }[];
  github?: GithubWorkItemView;
}

interface BacklogMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function BacklogBoard({
  projectKey,
  initialItems,
  statusNames,
  statuses,
  members,
  canManageTasks = false,
}: {
  projectKey: string;
  initialItems: BacklogItem[];
  statusNames: Record<string, string>;
  statuses: any[];
  members: BacklogMember[];
  canManageTasks?: boolean;
}) {
  const membersMap = new Map(members.map((member) => [member.id, member]));

  const [items, setItems] = useState(initialItems);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<DetailWorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const sseUrl = `/api/projects/${projectKey}/work-items/sse`;
    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        if (event.data === "ping") return;
        const payload = JSON.parse(event.data);
        const { type, data } = payload;

        if (type === "created") {
          setItems((prev) => {
            if (prev.some((item) => item.key === data.key)) return prev;
            return [...prev, data];
          });
        } else if (type === "updated") {
          setItems((prev) =>
            prev.map((item) => (item.key === data.key ? { ...item, ...data } : item))
          );
        } else if (type === "reordered") {
          router.refresh();
        }
      } catch (err) {
        console.error("Failed to parse SSE payload", err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE Connection encountered an issue, browser will reconnect automatically", err);
    };

    return () => {
      eventSource.close();
    };
  }, [projectKey, router]);

  function handleItemUpdate(updated: DetailWorkItem) {
    setItems((prev) =>
      prev.map((i) => (i.key === updated.key ? { ...i, ...updated } : i)),
    );
    setDetailItem(updated);
  }

  async function persist(nextItems: BacklogItem[], previous: BacklogItem[]) {
    setItems(nextItems);
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/api/projects/${projectKey}/work-items/reorder`, {
        method: "PATCH",
        body: JSON.stringify({
          orderedKeys: nextItems.map((item) => item.key),
        }),
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
                {canManageTasks && (
                  <NewWorkItemModal
                    projectKey={projectKey}
                    statuses={statuses}
                    members={members}
                  />
                )}
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
                <EmptyDescription>
                  Tạo work item trong project overview trước.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-2">
              {items.map((item, index) => {
                const assignee = item.assigneeId
                  ? membersMap.get(item.assigneeId)
                  : null;
                const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                const now = new Date();
                const isOverdue = dueDate !== null && dueDate < now;
                const isDueSoon =
                  !isOverdue &&
                  dueDate !== null &&
                  dueDate.getTime() - now.getTime() <= 2 * 24 * 60 * 60 * 1000;

                return (
                  <article
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card p-3 transition",
                      canManageTasks
                        ? "cursor-pointer active:cursor-grabbing hover:bg-muted/20"
                        : "cursor-default",
                      isOverdue
                        ? "border-destructive/70 hover:border-destructive"
                        : isDueSoon
                          ? "border-warning/70 hover:border-warning"
                          : "hover:border-primary/30",
                      draggedKey === item.key && "opacity-50",
                    )}
                    onClick={() => {
                      setDetailItem(item);
                      setDrawerOpen(true);
                    }}
                    draggable={canManageTasks}
                    key={item.key}
                    onDragStart={(event) => {
                      if (!canManageTasks) return;
                      setDraggedKey(item.key);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", item.key);
                    }}
                    onDragEnd={() => canManageTasks && setDraggedKey(null)}
                    onDragOver={(event) =>
                      canManageTasks && event.preventDefault()
                    }
                    onDrop={(event) => canManageTasks && drop(event, index)}
                  >
                    <div
                      className={cn(
                        "p-1 rounded transition",
                        canManageTasks
                          ? "cursor-grab active:cursor-grabbing hover:bg-muted"
                          : "cursor-default opacity-50",
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <WorkItemTypeIcon type={item.type} size={18} />
                    </div>
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="truncate">
                          {item.key} · {item.summary}
                        </strong>

                        <Badge variant="outline" className="gap-1.5 capitalize">
                          <PriorityIcon
                            priority={item.priority}
                            className="size-3 shrink-0"
                          />
                          {item.priority}
                        </Badge>
                        <Badge variant="info">
                          {statusNames[item.statusId] ?? item.statusId}
                        </Badge>
                        {dueDate && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 text-[10px]",
                              isOverdue
                                ? "border-destructive text-destructive"
                                : isDueSoon
                                  ? "border-warning text-warning"
                                  : "text-muted-foreground",
                            )}
                            title={
                              isOverdue
                                ? "Overdue!"
                                : isDueSoon
                                  ? "Due soon"
                                  : "Due date"
                            }
                          >
                            {isOverdue ? (
                              <>
                                <AlertCircle className="size-3" />
                                <span>Overdue</span>
                              </>
                            ) : isDueSoon ? (
                              <>
                                <Clock className="size-3" />
                                <span>Due soon</span>
                              </>
                            ) : (
                              <>
                                <Calendar className="size-3" />
                                <span>
                                  {dueDate.toLocaleDateString("vi-VN", {
                                    day: "2-digit",
                                    month: "2-digit",
                                  })}
                                </span>
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <GithubWorkItemLinks github={item.github} compact />
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      {assignee ? (
                        <Avatar
                          className="size-7"
                          title={`Assigned to ${assignee.name}`}
                        >
                          <AvatarImage
                            src={assignee.avatarUrl}
                            alt={assignee.name}
                          />
                          <AvatarFallback className="text-[10px] font-black">
                            {getInitials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {canManageTasks && (
                <div className="mt-3 flex justify-center border-t pt-3">
                  <NewWorkItemModal
                    projectKey={projectKey}
                    statuses={statuses}
                    members={members}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full max-w-xs gap-2"
                      >
                        <Plus className="size-4" />
                        Tạo công việc mới
                      </Button>
                    }
                  />
                </div>
              )}
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
