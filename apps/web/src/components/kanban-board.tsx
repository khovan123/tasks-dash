"use client";

import type { DragEvent } from "react";
import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  Clock,
  Search,
  User,
  GitPullRequest,
  GitBranch,
  GitCommit,
} from "lucide-react";
import {
  WorkItemTypeIcon,
  WORK_ITEM_TYPE_LABELS,
} from "@/components/work-item-type-icon";
import { apiRequest } from "@/lib/api/api-request";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PriorityIcon } from "@/components/priority-icon";
import {
  WorkItemDetailDrawer,
  type DetailWorkItem,
} from "@/components/work-item-detail-drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface WorkflowStatus {
  id: string;
  name: string;
  category: string;
  color?: string;
}

interface KanbanItem {
  key: string;
  summary: string;
  type: string;
  priority: string;
  statusId: string;
  storyPoints?: number;
  dueDate?: string;
  startDate?: string;
  labels: string[];
  assigneeId?: string;
  description?: string;
  figmaLinks?: { label: string; url: string }[];
  documentLinks?: { label: string; url: string }[];
  github?: {
    branches: string[];
    commits: Array<{
      sha: string;
      message: string;
      url: string | null;
      branch: string | null;
      committedAt: string | null;
    }>;
    pullRequests: Array<{
      number: number;
      title: string;
      url: string;
      state: string;
      status: string;
      draft: boolean;
      headBranch: string;
      baseBranch: string;
      headSha: string;
      action: string;
      authorLogin: string | null;
    }>;
  };
}

interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
}

export function KanbanBoard({
  projectKey,
  initialItems,
  statuses,
  members,
}: {
  projectKey: string;
  initialItems: KanbanItem[];
  statuses: WorkflowStatus[];
  members: WorkspaceMember[];
}) {
  const [items, setItems] = useState<KanbanItem[]>(initialItems);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailItem, setDetailItem] = useState<DetailWorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function handleItemUpdate(updated: DetailWorkItem) {
    setItems((prev) =>
      prev.map((i) => (i.key === updated.key ? { ...i, ...updated } : i)),
    );
    setDetailItem(updated);
  }

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(
    null,
  );

  // Map assignees by ID for easy lookup
  const membersMap = useMemo(() => {
    return new Map(members.map((m) => [m.id, m]));
  }, [members]);

  // Group items by status
  const groupedItems = useMemo(() => {
    const groups: Record<string, KanbanItem[]> = {};
    for (const status of statuses) {
      groups[status.id] = [];
    }

    // Filter items based on search and user selection
    const filtered = items.filter((item) => {
      const matchesSearch =
        item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.key.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAssignee =
        selectedAssigneeId === null || item.assigneeId === selectedAssigneeId;

      return matchesSearch && matchesAssignee;
    });

    for (const item of filtered) {
      if (groups[item.statusId]) {
        groups[item.statusId].push(item);
      } else {
        // Fallback for items with legacy/deleted status
        const defaultStatus = statuses[0]?.id;
        if (defaultStatus) {
          groups[defaultStatus].push(item);
        }
      }
    }

    return groups;
  }, [items, statuses, searchQuery, selectedAssigneeId]);

  async function handleStatusTransition(itemKey: string, nextStatusId: string) {
    const previous = [...items];
    const itemIndex = items.findIndex((item) => item.key === itemKey);
    if (itemIndex < 0 || items[itemIndex].statusId === nextStatusId) return;

    // Optimistic UI update
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

  function handleDragStart(event: DragEvent, itemKey: string) {
    setDraggedKey(itemKey);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemKey);
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent, targetStatusId: string) {
    event.preventDefault();
    const itemKey = draggedKey ?? event.dataTransfer.getData("text/plain");
    setDraggedKey(null);
    if (itemKey) {
      void handleStatusTransition(itemKey, targetStatusId);
    }
  }

  // Get initials for avatar
  function getInitials(name: string) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Search / Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search board"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Avatar filter list */}
          <div className="flex items-center -space-x-1 overflow-hidden py-1 px-2 border-l border-r">
            <button
              onClick={() => setSelectedAssigneeId(null)}
              className={cn(
                "relative z-10 flex size-7 items-center justify-center rounded-full border border-background bg-muted text-xs font-semibold hover:scale-105 transition",
                selectedAssigneeId === null &&
                  "ring-2 ring-primary ring-offset-1",
              )}
              title="All Members"
            >
              All
            </button>
            {members.map((member) => {
              const initials = getInitials(member.name);
              const isSelected = selectedAssigneeId === member.id;
              return (
                <button
                  key={member.id}
                  onClick={() => setSelectedAssigneeId(member.id)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border border-background bg-primary text-[10px] font-black text-primary-foreground hover:scale-105 transition",
                    isSelected && "ring-2 ring-primary ring-offset-1 z-20",
                  )}
                  title={member.name}
                >
                  {initials}
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedAssigneeId(null);
            }}
            className="text-xs"
          >
            Clear filters
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary">
            Complete sprint
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="max-w-2xl">
          <AlertTitle>Gặp lỗi khi cập nhật</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Kanban Columns Grid */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin select-none">
        {statuses.map((status) => {
          const columnItems = groupedItems[status.id] || [];
          return (
            <div
              key={status.id}
              className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/40 border-t-4 border-l border-r border-b p-3 min-h-125"
              style={{ borderTopColor: status.color || "#64748b" }}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {status.name}
                </span>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  {columnItems.length}
                </Badge>
              </div>

              {/* Cards list */}
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {columnItems.map((item) => {
                  const assignee = item.assigneeId
                    ? membersMap.get(item.assigneeId)
                    : null;
                  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                  const now = new Date();
                  const isOverdue = dueDate !== null && dueDate < now;
                  const isDueSoon =
                    !isOverdue &&
                    dueDate !== null &&
                    dueDate.getTime() - now.getTime() <=
                      2 * 24 * 60 * 60 * 1000;
                  const formattedDate = dueDate
                    ? format(dueDate, "MMM d")
                    : null;

                  return (
                    <Card
                      key={item.key}
                      className={cn(
                        "cursor-pointer border bg-card transition hover:shadow-sm active:cursor-grabbing",
                        isOverdue
                          ? "border-destructive/70 hover:border-destructive"
                          : isDueSoon
                            ? "border-warning/70 hover:border-warning"
                            : "hover:border-primary/45",
                        draggedKey === item.key && "opacity-40",
                      )}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.key)}
                      onDragEnd={() => setDraggedKey(null)}
                      onClick={() => {
                        setDetailItem(item);
                        setDrawerOpen(true);
                      }}
                    >
                      <CardContent className="p-3.5 flex flex-col gap-3">
                        {/* Title and details */}
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground font-mono font-bold">
                            {item.key}
                          </span>
                          <p className="text-sm font-medium text-foreground leading-snug">
                            {item.summary}
                          </p>
                        </div>

                        {/* Badges for tags */}
                        {item.labels && item.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.labels.map((label) => (
                              <Badge
                                key={label}
                                variant="outline"
                                className="text-[9px] px-1 py-0 border bg-muted/10 text-muted-foreground"
                              >
                                {label}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Footer details */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                          <div className="flex items-center gap-2">
                            {/* Type icon */}
                            <div
                              title={
                                WORK_ITEM_TYPE_LABELS[item.type] ?? item.type
                              }
                            >
                              <WorkItemTypeIcon type={item.type} size={14} />
                            </div>

                            {/* Priority Icon */}
                            <span title={`Priority: ${item.priority}`}>
                              <PriorityIcon
                                priority={item.priority}
                                className="size-3.5 shrink-0"
                              />
                            </span>

                            {/* GitHub Pull Request Link */}
                            {item.github?.pullRequests &&
                              item.github.pullRequests.length > 0 && (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center justify-center p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition shrink-0"
                                      title="GitHub Pull Requests"
                                    >
                                      <GitPullRequest className="size-3.5 text-blue-500" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-80 p-4 shadow-xl"
                                    align="start"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex flex-col gap-3.5 text-xs text-foreground">
                                      {item.github.pullRequests.map((pr) => {
                                        const latestCommit =
                                          item.github?.commits?.find(
                                            (c) => c.sha === pr.headSha,
                                          ) ||
                                          item.github?.commits?.find(
                                            (c) => c.branch === pr.headBranch,
                                          ) ||
                                          item.github?.commits?.[0];
                                        const stateColor =
                                          pr.state === "MERGED"
                                            ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50"
                                            : pr.state === "CLOSED"
                                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50"
                                              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";

                                        return (
                                          <div
                                            key={pr.number}
                                            className="flex flex-col gap-2.5 pb-2.5 last:pb-0 last:border-b-0 border-b border-border/50"
                                          >
                                            <div className="flex flex-col gap-1.5">
                                              <a
                                                href={pr.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-semibold text-primary hover:underline leading-snug text-[13px] flex items-start gap-1"
                                              >
                                                <span className="shrink-0 text-muted-foreground font-normal">
                                                  #{pr.number}
                                                </span>
                                                <span>·</span>
                                                <span>{pr.title}</span>
                                              </a>
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                  className={cn(
                                                    "px-2 py-0.5 text-[10px] font-semibold rounded border",
                                                    stateColor,
                                                  )}
                                                >
                                                  {pr.state === "MERGED"
                                                    ? "Merged"
                                                    : pr.state === "CLOSED"
                                                      ? "Closed"
                                                      : "Open"}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                  {pr.headBranch} →{" "}
                                                  {pr.baseBranch}{" "}
                                                  {pr.authorLogin
                                                    ? `· @${pr.authorLogin}`
                                                    : ""}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border/40">
                                              <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                                                <GitBranch className="size-3.5 text-muted-foreground" />
                                                <span>Branch</span>
                                              </div>
                                              <code className="px-1.5 py-0.5 rounded bg-muted/65 text-[11px] font-mono text-muted-foreground break-all">
                                                {pr.headBranch}
                                              </code>
                                            </div>

                                            {latestCommit && (
                                              <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                                                  <GitCommit className="size-3.5 text-muted-foreground" />
                                                  <span>Commit gần nhất</span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground leading-relaxed pl-1">
                                                  <span className="font-mono font-semibold text-foreground bg-muted/50 px-1 py-0.5 rounded mr-1">
                                                    {latestCommit.sha.slice(
                                                      0,
                                                      7,
                                                    )}
                                                  </span>
                                                  · {latestCommit.message}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}

                            {/* Due date if exists */}
                            {formattedDate && (
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-[10px]",
                                  isOverdue
                                    ? "text-destructive font-semibold"
                                    : isDueSoon
                                      ? "text-warning font-semibold"
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
                                <Clock className="size-3" />
                                <span>{formattedDate}</span>
                              </div>
                            )}

                            {/* Story points */}
                            {item.storyPoints !== undefined && (
                              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-muted hover:bg-muted text-muted-foreground border">
                                {item.storyPoints}
                              </Badge>
                            )}
                          </div>

                          {/* Assignee Avatar */}
                          {assignee ? (
                            <div
                              className="flex size-5 items-center justify-center rounded-full bg-primary text-[8px] font-black text-primary-foreground"
                              title={`Assigned to ${assignee.name}`}
                            >
                              {getInitials(assignee.name)}
                            </div>
                          ) : (
                            <div
                              className="flex size-5 items-center justify-center rounded-full bg-muted text-[8px] text-muted-foreground border"
                              title="Unassigned"
                            >
                              <User className="size-3" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {columnItems.length === 0 && (
                  <div className="flex flex-1 flex-col items-center justify-center border border-dashed rounded-lg py-8 text-muted-foreground text-xs">
                    No items here
                  </div>
                )}
              </div>
            </div>
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
      />
    </div>
  );
}
