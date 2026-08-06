"use client";

import React, { useState, type DragEvent } from "react";
import { Check, GitPullRequest, Info, Plus, Save, Trash2 } from "lucide-react";
import { DEFAULT_WORKFLOW_STATUS_IDS } from "@tasks-dash/contracts";
import { apiRequest } from "@/lib/api/api-request";
import { SectionHeading } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#64748b",
  "#94a3b8",
  "#3b82f6",
  "#2563eb",
  "#1d4ed8",
  "#0ea5e9",
  "#6366f1",
  "#8b5cf6",
  "#7c3aed",
  "#a855f7",
  "#10b981",
  "#22c55e",
  "#16a34a",
  "#14b8a6",
  "#f59e0b",
  "#f97316",
  "#fb923c",
  "#fbbf24",
  "#ef4444",
  "#dc2626",
  "#ec4899",
  "#f43f5e",
  "#06b6d4",
  "#38bdf8",
] as const;

interface WorkflowStatus {
  id: string;
  name: string;
  category: "TODO" | "IN_PROGRESS" | "DONE";
  color?: string;
  order: number;
}

interface WorkflowTransition {
  id: string;
  name: string;
  fromStatusId: string;
  toStatusId: string;
  allowedRoleIds?: string[];
}

interface Workflow {
  name: string;
  defaultStatusId: string;
  statuses: WorkflowStatus[];
  transitions?: WorkflowTransition[];
}

const SYSTEM_STATUSES: WorkflowStatus[] = [
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.toDo,
    name: "ToDo",
    category: "TODO",
    color: "#9ca3af",
    order: 0,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.inProgress,
    name: "In Progress",
    category: "IN_PROGRESS",
    color: "#2563eb",
    order: 1,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.review,
    name: "Review",
    category: "IN_PROGRESS",
    color: "#7c3aed",
    order: 2,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.requestChange,
    name: "Request Change",
    category: "IN_PROGRESS",
    color: "#dc2626",
    order: 3,
  },
  {
    id: DEFAULT_WORKFLOW_STATUS_IDS.done,
    name: "Done",
    category: "DONE",
    color: "#16a34a",
    order: 4,
  },
];

const SYSTEM_STATUS_IDS = new Set(SYSTEM_STATUSES.map((status) => status.id));

const SYSTEM_TRANSITION_PAIRS = new Set([
  `${DEFAULT_WORKFLOW_STATUS_IDS.toDo}:${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}:${DEFAULT_WORKFLOW_STATUS_IDS.review}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.review}:${DEFAULT_WORKFLOW_STATUS_IDS.requestChange}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.requestChange}:${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}:${DEFAULT_WORKFLOW_STATUS_IDS.done}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.review}:${DEFAULT_WORKFLOW_STATUS_IDS.done}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.requestChange}:${DEFAULT_WORKFLOW_STATUS_IDS.done}`,
  `${DEFAULT_WORKFLOW_STATUS_IDS.done}:${DEFAULT_WORKFLOW_STATUS_IDS.inProgress}`,
]);

const GITHUB_AUTOMATION_NOTES = [
  {
    label: "PR hoặc branch mới",
    result: "Tự chuyển sang In Progress",
  },
  {
    label: "Request review / ready for review",
    result: "Tự chuyển sang Review",
  },
  {
    label: "Review = changes requested",
    result: "Tự chuyển sang Request Change",
  },
  {
    label: "Push commit mới",
    result: "Tự chuyển lại In Progress",
  },
  {
    label: "Merge hoặc close PR",
    result: "Tự chuyển sang Done",
  },
  {
    label: "Reopen PR",
    result: "Tự chuyển lại In Progress",
  },
] as const;

export function WorkflowEditorForm({
  projectKey,
  initialWorkflow,
  canManage = false,
}: {
  projectKey: string;
  initialWorkflow: Workflow | null;
  canManage?: boolean;
}) {
  const workflowName = initialWorkflow?.name || `${projectKey} Workflow`;
  const [defaultStatusId] = useState(DEFAULT_WORKFLOW_STATUS_IDS.toDo);
  const [statuses, setStatuses] = useState<WorkflowStatus[]>(
    initialWorkflow?.statuses?.length
      ? [...initialWorkflow.statuses].sort((a, b) => a.order - b.order)
      : SYSTEM_STATUSES,
  );
  const [transitions, setTransitions] = useState<WorkflowTransition[]>(
    initialWorkflow?.transitions || [],
  );
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusCategory, setNewStatusCategory] = useState<
    "TODO" | "IN_PROGRESS" | "DONE"
  >("TODO");
  const [newStatusColor, setNewStatusColor] = useState("#6366f1");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isSystemStatus(statusId: string): boolean {
    return SYSTEM_STATUS_IDS.has(statusId);
  }

  function isSystemTransition(fromStatusId: string, toStatusId: string): boolean {
    return SYSTEM_TRANSITION_PAIRS.has(`${fromStatusId}:${toStatusId}`);
  }

  function generateId(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
  }

  function handleAddStatus(e: React.FormEvent) {
    e.preventDefault();
    if (!newStatusName.trim()) return;

    const id = generateId(newStatusName);
    if (statuses.some((status) => status.id === id)) {
      setError(`Trạng thái "${newStatusName}" đã tồn tại.`);
      return;
    }

    const nextStatus: WorkflowStatus = {
      id,
      name: newStatusName.trim(),
      category: newStatusCategory,
      color: newStatusColor,
      order: statuses.length,
    };

    setStatuses([...statuses, nextStatus]);
    setNewStatusName("");
    setNewStatusColor("#6366f1");
    setError(null);
  }

  function handleRemoveStatus(statusId: string) {
    if (isSystemStatus(statusId)) {
      setError("Không thể xóa trạng thái hệ thống của workflow GitHub.");
      return;
    }

    const filtered = statuses
      .filter((status) => status.id !== statusId)
      .map((status, index) => ({ ...status, order: index }));
    setStatuses(filtered);
    setTransitions((prev) =>
      prev.filter(
        (transition) =>
          transition.fromStatusId !== statusId &&
          transition.toStatusId !== statusId,
      ),
    );
    setError(null);
  }

  function handleUpdateStatusColor(statusId: string, color: string) {
    if (isSystemStatus(statusId)) return;
    setStatuses((prev) =>
      prev.map((status) => (status.id === statusId ? { ...status, color } : status)),
    );
  }

  function toggleTransition(fromStatusId: string, toStatusId: string) {
    if (!canManage) return;
    if (isSystemTransition(fromStatusId, toStatusId)) {
      setError("Không thể chỉnh sửa transition hệ thống tự động từ GitHub.");
      return;
    }

    setTransitions((prev) => {
      const exists = prev.some(
        (transition) =>
          transition.fromStatusId === fromStatusId &&
          transition.toStatusId === toStatusId,
      );
      if (exists) {
        return prev.filter(
          (transition) =>
            !(
              transition.fromStatusId === fromStatusId &&
              transition.toStatusId === toStatusId
            ),
        );
      }
      return [
        ...prev,
        {
          id: `${fromStatusId}_TO_${toStatusId}`,
          name: `Go to ${toStatusId}`,
          fromStatusId,
          toStatusId,
          allowedRoleIds: [],
        },
      ];
    });
  }

  function handleStatusDrop(e: DragEvent<HTMLDivElement>, targetIndex: number) {
    e.preventDefault();
    if (!canManage) return;
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    if (isSystemStatus(statuses[draggedIndex]?.id) || isSystemStatus(statuses[targetIndex]?.id)) {
      return;
    }

    const nextStatuses = [...statuses];
    const [moved] = nextStatuses.splice(draggedIndex, 1);
    nextStatuses.splice(targetIndex, 0, moved);

    const ordered = nextStatuses.map((status, index) => ({ ...status, order: index }));
    setStatuses(ordered);
    setDraggedIndex(null);
  }

  async function handleSave() {
    if (statuses.length === 0) {
      setError("Cần có ít nhất một trạng thái trong workflow.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await apiRequest(`/api/projects/${projectKey}/workflow`, {
        method: "PUT",
        body: JSON.stringify({
          name: workflowName,
          defaultStatusId,
          statuses,
          transitions: transitions.filter(
            (transition) =>
              statuses.some((status) => status.id === transition.fromStatusId) &&
              statuses.some((status) => status.id === transition.toStatusId),
          ),
        }),
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu workflow.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Lỗi xảy ra</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert
          variant="success"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
        >
          <Check className="mr-2 inline size-4" />
          <AlertTitle className="inline font-bold">Thành công</AlertTitle>
          <AlertDescription className="mt-1 block text-xs">
            Quy trình làm việc (Workflow) đã được lưu thành công!
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <SectionHeading
            eyebrow="Workflow Configuration"
            title="Project Workflow States"
            meta={`${statuses.length} states`}
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Alert className="border-primary/20 bg-primary/5">
            <GitPullRequest className="size-4 text-primary" />
            <AlertTitle className="flex items-center gap-2">
              GitHub-managed flow
              <Badge
                variant="outline"
                className="border-primary/30 text-[10px] text-primary"
                title="Các trạng thái và transition này được GitHub App điều khiển tự động."
              >
                Auto workflow
              </Badge>
            </AlertTitle>
            <AlertDescription className="mt-2 grid gap-2 text-xs text-muted-foreground">
              <p>
                Các trạng thái hệ thống <strong>ToDo</strong>,{" "}
                <strong>In Progress</strong>, <strong>Review</strong>,{" "}
                <strong>Request Change</strong>, <strong>Done</strong> và các
                transition GitHub tương ứng không thể sửa hoặc xóa.
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {GITHUB_AUTOMATION_NOTES.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-border/60 bg-background/80 px-3 py-2"
                  >
                    <div className="font-medium text-foreground">{item.label}</div>
                    <div>{item.result}</div>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>

          <div className="max-w-md">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="default-status"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Trạng thái mặc định
              </label>
              <Select value={defaultStatusId} onValueChange={() => undefined}>
                <SelectTrigger id="default-status" disabled>
                  <SelectValue placeholder="Chọn trạng thái mặc định" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Task mới luôn bắt đầu ở <strong>ToDo</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Danh sách trạng thái (Sắp xếp cột trên Board)
            </h3>
            <div className="grid gap-2 rounded-lg border bg-muted/10 p-2">
              {statuses.map((status, index) => (
                <div
                  key={status.id}
                  draggable={canManage && !isSystemStatus(status.id)}
                  onDragStart={(e) => {
                    if (!canManage || isSystemStatus(status.id)) {
                      e.preventDefault();
                      return;
                    }
                    setDraggedIndex(index);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => canManage && setDraggedIndex(null)}
                  onDragOver={(e) => canManage && e.preventDefault()}
                  onDrop={(e) => canManage && handleStatusDrop(e, index)}
                  className={cn(
                    "flex flex-col gap-3 rounded-md border bg-card p-3 text-sm transition-opacity",
                    !canManage || isSystemStatus(status.id) ? "cursor-default" : "cursor-grab",
                    draggedIndex === index && "opacity-40",
                  )}
                  style={{
                    borderLeft: `4px solid ${status.color || "#64748b"}`,
                  }}
                >
                  <div className="flex w-full items-center justify-between">
                    <div
                      className={cn(
                        "flex items-center gap-3 select-none",
                        !canManage || isSystemStatus(status.id)
                          ? "cursor-default"
                          : "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <label
                        title={
                          !canManage
                            ? "Bạn không có quyền đổi màu"
                            : isSystemStatus(status.id)
                              ? "Màu trạng thái hệ thống được cố định"
                              : "Đổi màu trạng thái"
                        }
                        className={cn(
                          "relative group",
                          !canManage || isSystemStatus(status.id)
                            ? "cursor-not-allowed opacity-80"
                            : "cursor-pointer",
                        )}
                      >
                        <span
                          className="block size-5 rounded-full border-2 border-white shadow-sm ring-1 ring-border"
                          style={{ background: status.color || "#64748b" }}
                        />
                        <input
                          type="color"
                          value={status.color || "#64748b"}
                          onChange={(e) =>
                            handleUpdateStatusColor(status.id, e.target.value)
                          }
                          disabled={!canManage || isSystemStatus(status.id)}
                          className="absolute inset-0 size-5 cursor-pointer opacity-0"
                        />
                      </label>
                      <span className="font-semibold text-foreground">
                        {status.name}
                      </span>
                      {isSystemStatus(status.id) ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px]"
                          title="GitHub-managed state: trạng thái này được GitHub App tự động điều khiển bởi PR/review/push/merge."
                        >
                          <Info className="size-3" />
                          Hệ thống
                        </Badge>
                      ) : null}
                      {status.id === defaultStatusId ? (
                        <Badge
                          variant="outline"
                          className="border-primary text-[10px] text-primary"
                        >
                          Mặc định
                        </Badge>
                      ) : null}
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveStatus(status.id)}
                        disabled={isSystemStatus(status.id)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Xóa trạng thái"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>

                  <div className="mt-1 rounded border-t bg-muted/5 p-2 pt-2">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Được phép di chuyển từ "{status.name}" sang:
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {statuses
                        .filter((otherStatus) => otherStatus.id !== status.id)
                        .map((otherStatus) => {
                          const checked = transitions.some(
                            (transition) =>
                              transition.fromStatusId === status.id &&
                              transition.toStatusId === otherStatus.id,
                          );
                          const locked = isSystemTransition(
                            status.id,
                            otherStatus.id,
                          );
                          return (
                            <label
                              key={otherStatus.id}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs transition",
                                locked || !canManage
                                  ? "cursor-not-allowed bg-muted/20 opacity-85"
                                  : "cursor-pointer bg-muted/30 hover:bg-muted",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={locked || !canManage}
                                onChange={() =>
                                  toggleTransition(status.id, otherStatus.id)
                                }
                                className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span
                                className="inline-block size-2.5 rounded-full"
                                style={{
                                  background: otherStatus.color || "#64748b",
                                }}
                              />
                              <span className="font-medium">
                                {otherStatus.name}
                              </span>
                              {locked ? (
                                <Badge
                                  variant="outline"
                                  className="h-4 px-1 py-0 text-[9px]"
                                  title="GitHub-managed transition: transition này được kích hoạt tự động bởi sự kiện GitHub và không thể chỉnh sửa."
                                >
                                  Auto
                                </Badge>
                              ) : null}
                            </label>
                          );
                        })}
                      {statuses.length <= 1 ? (
                        <span className="text-xs italic text-muted-foreground">
                          Không có trạng thái khác để cấu hình di chuyển.
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {canManage && (
            <form onSubmit={handleAddStatus} className="flex flex-col gap-3 border-t pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Thêm trạng thái mới
              </h4>
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_140px]">
                <Input
                  placeholder="Tên trạng thái (Ví dụ: Ready for Dev, Blocked...)"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                />
                <Select
                  value={newStatusCategory}
                  onValueChange={(value: "TODO" | "IN_PROGRESS" | "DONE") =>
                    setNewStatusCategory(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Phân loại" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-slate-400" />
                        <span>TO DO</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-blue-500" />
                        <span>IN PROGRESS</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="DONE">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-green-500" />
                        <span>DONE</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Chọn màu
                </span>
                <div className="flex items-center gap-2">
                  <label
                    title="Tuỳ chỉnh màu"
                    className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 shadow-sm"
                    style={{ background: newStatusColor }}
                  >
                    <input
                      type="color"
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value)}
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                    />
                  </label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {newStatusColor}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ← click để chọn màu tuỳ ý
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      onClick={() => setNewStatusColor(color)}
                      className={cn(
                        "size-6 rounded-md border-2 transition hover:scale-110 active:scale-95",
                        newStatusColor === color
                          ? "border-foreground ring-2 ring-foreground/40 ring-offset-1"
                          : "border-transparent",
                      )}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="secondary"
                className="h-10 self-start px-5"
              >
                <Plus className="mr-1.5 size-4" /> Thêm trạng thái
              </Button>
            </form>
          )}

          {canManage && (
            <div className="flex justify-end border-t pt-4">
              <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
                <Save className="size-4" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
