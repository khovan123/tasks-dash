"use client";

import type { DragEvent } from "react";
import { useState } from "react";
import {
  GithubWorkItemLinks,
  type GithubWorkItemView,
} from "@/components/github-work-item-links";
import { apiRequest } from "@/lib/api/api-request";

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
    <section className="data-card">
      <div className="section-heading">
        <div><span>DRAG TO RERANK</span><h2>Backlog</h2></div>
        <strong>{saving ? "Đang lưu…" : `${items.length} items`}</strong>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {items.length === 0 ? (
        <p className="empty-inline">Backlog chưa có work item.</p>
      ) : (
        <div className="backlog-list">
          {items.map((item, index) => (
            <article
              className="backlog-row"
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
              <span className="drag-handle" aria-hidden="true">⋮⋮</span>
              <div className="backlog-main">
                <strong>{item.key} · {item.summary}</strong>
                <span>{item.type} · {item.priority} · {statusNames[item.statusId] ?? item.statusId}</span>
                <GithubWorkItemLinks github={item.github} compact />
              </div>
              <div className="backlog-actions">
                <button className="ghost compact" type="button" disabled={index === 0 || saving} onClick={() => move(item.key, index - 1)}>↑</button>
                <button className="ghost compact" type="button" disabled={index === items.length - 1 || saving} onClick={() => move(item.key, index + 1)}>↓</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
