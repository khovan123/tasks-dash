"use client";

import React, { useState, type DragEvent } from "react";
import { Check, GitPullRequest, Info, Plus, Save, Trash2 } from "lucide-react";
import { DEFAULT_WORKFLOW_STATUS_IDS } from "@tasks-dash/contracts";
import { SectionHeading } from "@/components/molecules/section-heading";
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
import {
  GITHUB_WORKFLOW_AUTOMATION_NOTES,
  SYSTEM_WORKFLOW_STATUSES,
  WORKFLOW_PRESET_COLORS,
} from "@/features/workflow/constants";
import {
  generateWorkflowStatusId,
  isSystemWorkflowStatus,
  isSystemWorkflowTransition,
} from "@/features/workflow/lib/workflow";
import type {
  WorkflowDefinition,
  WorkflowStatus,
  WorkflowStatusCategory,
  WorkflowTransition,
} from "@/features/workflow/types";
import { apiRequest } from "@/lib/api/api-request";
import { cn } from "@/lib/utils";

export function WorkflowEditorForm({
  projectKey,
  initialWorkflow,
  canManage = false,
}: {
  projectKey: string;
  initialWorkflow: WorkflowDefinition | null;
  canManage?: boolean;
}) {
  const workflowName = initialWorkflow?.name || `${projectKey} Workflow`;
  const [defaultStatusId] = useState(DEFAULT_WORKFLOW_STATUS_IDS.toDo);
  const [statuses, setStatuses] = useState<WorkflowStatus[]>(
    initialWorkflow?.statuses?.length
      ? [...initialWorkflow.statuses].sort((a, b) => a.order - b.order)
      : SYSTEM_WORKFLOW_STATUSES,
  );
  const [transitions, setTransitions] = useState<WorkflowTransition[]>(
    initialWorkflow?.transitions || [],
  );
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusCategory, setNewStatusCategory] =
    useState<WorkflowStatusCategory>("TODO");
  const [newStatusColor, setNewStatusColor] = useState("#6366f1");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleAddStatus(event: React.FormEvent) {
    event.preventDefault();
    if (!newStatusName.trim()) return;

    const id = generateWorkflowStatusId(newStatusName);
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
    if (isSystemWorkflowStatus(statusId)) {
      setError("Không thể xóa trạng thái hệ thống của workflow GitHub.");
      return;
    }

    const filtered = statuses
      .filter((status) => status.id !== statusId)
      .map((status, index) => ({ ...status, order: index }));
    setStatuses(filtered);
    setTransitions((previous) =>
      previous.filter(
        (transition) =>
          transition.fromStatusId !== statusId &&
          transition.toStatusId !== statusId,
      ),
    );
    setError(null);
  }

  function handleUpdateStatusColor(statusId: string, color: string) {
    if (isSystemWorkflowStatus(statusId)) return;
    setStatuses((previous) =>
      previous.map((status) =>
        status.id === statusId ? { ...status, color } : status,
      ),
    );
  }

  function toggleTransition(fromStatusId: string, toStatusId: string) {
    if (!canManage) return;
    if (isSystemWorkflowTransition(fromStatusId, toStatusId)) {
      setError("Không thể chỉnh sửa transition hệ thống tự động từ GitHub.");
      return;
    }

    setTransitions((previous) => {
      const exists = previous.some(
        (transition) =>
          transition.fromStatusId === fromStatusId &&
          transition.toStatusId === toStatusId,
      );
      if (exists) {
        return previous.filter(
          (transition) =>
            !(
              transition.fromStatusId === fromStatusId &&
              transition.toStatusId === toStatusId
            ),
        );
      }
      return [
        ...previous,
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

  function handleStatusDrop(event: DragEvent<HTMLDivElement>, targetIndex: number) {
    event.preventDefault();
    if (!canManage) return;
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    if (
      isSystemWorkflowStatus(statuses[draggedIndex]?.id) ||
      isSystemWorkflowStatus(statuses[targetIndex]?.id)
    ) {
      return;
    }

    const nextStatuses = [...statuses];
    const [moved] = nextStatuses.splice(draggedIndex, 1);
    nextStatuses.splice(targetIndex, 0, moved);
    setStatuses(
      nextStatuses.map((status, index) => ({
        ...status,
        order: index,
      })),
    );
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
              statuses.some(
                (status) => status.id === transition.fromStatusId,
              ) &&
              statuses.some((status) => status.id === transition.toStatusId),
          ),
        }),
      });
      setSuccess(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Có lỗi xảy ra khi lưu workflow.",
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
                {GITHUB_WORKFLOW_AUTOMATION_NOTES.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-border/60 bg-background/80 px-3 py-2"
                  >
                    <div className="font-medium text-foreground">
                      {item.label}
                    </div>
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
                  draggable={canManage && !isSystemWorkflowStatus(status.id)}
                  onDragStart={(event) => {
                    if (!canManage || isSystemWorkflowStatus(status.id)) {
                      event.preventDefault();
                      return;
                    }
                    setDraggedIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => canManage && setDraggedIndex(null)}
                  onDragOver={(event) => canManage && event.preventDefault()}
                  onDrop={(event) => canManage && handleStatusDrop(event, index)}
                  className={cn(
                    "flex flex-col gap-3 rounded-md border bg-card p-3 text-sm transition-opacity",
                    !canManage || isSystemWorkflowStatus(status.id)
                      ? "cursor-default"
                      : "cursor-grab",
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
                        !canManage || isSystemWorkflowStatus(status.id)
                          ? "cursor-default"
                          : "cursor-grab active:cursor-grabbing",
                      )}
                    >
                      <label
                        title={
                          !canManage
                            ? "Bạn không có quyền đổi màu"
                            : isSystemWorkflowStatus(status.id)
                              ? "Màu trạng thái hệ thống được cố định"
                              : "Đổi màu trạng thái"
                        }
                        className={cn(
                          "relative group",
                          !canManage || isSystemWorkflowStatus(status.id)
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
                          onChange={(event) =>
                            handleUpdateStatusColor(status.id, event.target.value)
                          }
                          disabled={!canManage || isSystemWorkflowStatus(status.id)}
                          className="absolute inset-0 size-5 cursor-pointer opacity-0"
                        />
                      </label>
                      <span className="font-semibold text-foreground">
                        {status.name}
                      </span>
                      {isSystemWorkflowStatus(status.id) ? (
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

                    {canManage ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveStatus(status.id)}
                        disabled={isSystemWorkflowStatus(status.id)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Xóa trạng thái"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-1 rounded border-t bg-muted/5 p-2 pt-2">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Được phép di chuyển từ "{status.name}" sang:
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {statuses
                        .filter((otherStatus) => otherStatus.id !== status.id)
                        .map((otherStatus) => {
                          const checked =
                            transitions.some(
                              (transition) =>
                                transition.fromStatusId === status.id &&
                                transition.toStatusId === otherStatus.id,
                            ) ||
                            isSystemWorkflowTransition(
                              status.id,
                              otherStatus.id,
                            );
                          const locked = isSystemWorkflowTransition(
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

          {canManage ? (
            <form
              onSubmit={handleAddStatus}
              className="flex flex-col gap-3 border-t pt-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Thêm trạng thái mới
              </h4>
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_140px]">
                <Input
                  placeholder="Tên trạng thái"
                  value={newStatusName}
                  onChange={(event) => setNewStatusName(event.target.value)}
                />
                <Select
                  value={newStatusCategory}
                  onValueChange={(value: WorkflowStatusCategory) =>
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
                      onChange={(event) => setNewStatusColor(event.target.value)}
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
                  {WORKFLOW_PRESET_COLORS.map((color) => (
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
          ) : null}

          {canManage ? (
            <div className="flex justify-end border-t pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 px-6"
              >
                <Save className="size-4" />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
