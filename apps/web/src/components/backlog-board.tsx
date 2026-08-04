"use client";

import type { DragEvent } from "react";
import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import {
  GithubWorkItemLinks,
  type GithubWorkItemView,
} from "@/components/github-work-item-links";
import { apiRequest } from "@/lib/api/api-request";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

interface BacklogItem {
  key: string;
  summary: string;
  type: string;
  priority: string;
  statusId: string;
  rank: number;
  github?: GithubWorkItemView;
}

export function BacklogBoard({
  projectKey,
  initialItems,
  statusNames,
}: {
  projectKey: string;
  initialItems: BacklogItem[];
  statusNames: Record<string, string>;
}) {
  const [items, setItems] = useState(initialItems);
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function persist(nextItems: BacklogItem[], previous: BacklogItem[]) {
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
    <Card>
      <CardHeader>
        <SectionHeading
          eyebrow="Drag to rerank"
          title="Backlog"
          meta={saving ? "Đang lưu…" : `${items.length} items`}
        />
      </CardHeader>
      <CardContent className="space-y-4">
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
            {items.map((item, index) => (
              <article
                className={cn(
                  "grid cursor-grab grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card p-3 transition hover:border-primary/30 hover:bg-muted/20 active:cursor-grabbing",
                  draggedKey === item.key && "opacity-50",
                )}
                draggable
                key={item.key}
                onDragStart={(event) => {
                  setDraggedKey(item.key);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.key);
                }}
                onDragEnd={() => setDraggedKey(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => drop(event, index)}
              >
                <GripVertical className="size-5 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate">{item.key} · {item.summary}</strong>
                    <Badge variant="secondary">{item.type}</Badge>
                    <Badge variant="outline">{item.priority}</Badge>
                    <Badge variant="info">{statusNames[item.statusId] ?? item.statusId}</Badge>
                  </div>
                  <GithubWorkItemLinks github={item.github} compact />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    aria-label={`Đưa ${item.key} lên`}
                    disabled={index === 0 || saving}
                    onClick={() => move(item.key, index - 1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    aria-label={`Đưa ${item.key} xuống`}
                    disabled={index === items.length - 1 || saving}
                    onClick={() => move(item.key, index + 1)}
                  >
                    <ArrowDown />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
