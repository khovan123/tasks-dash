"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  PRIORITIES,
  type Priority,
  WORK_ITEM_TYPES,
  type WorkItemType,
} from "@tasks-dash/contracts";
import {
  Calendar as CalendarIcon,
  Link2,
  Figma,
  FileText,
  User,
  Tag,
  Pencil,
  Play,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WorkItemTypeIcon,
  WORK_ITEM_TYPE_LABELS,
} from "@/components/work-item-type-icon";
import { MemberIdentity } from "@/components/member-identity";
import { PriorityIcon, PRIORITY_LABELS } from "@/components/priority-icon";
import { apiRequest } from "@/lib/api/api-request";
import { cn } from "@/lib/utils";

export interface DetailWorkItem {
  key: string;
  summary: string;
  type: WorkItemType | string;
  priority: Priority | string;
  statusId: string;
  description?: string;
  storyPoints?: number;
  dueDate?: string;
  startDate?: string;
  startedAt?: string;
  assigneeId?: string;
  labels?: string[];
  figmaLinks?: { label: string; url: string }[];
  documentLinks?: { label: string; url: string }[];
}

interface WorkItemDetailDrawerProps {
  item: DetailWorkItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: { id: string; name: string; color?: string }[];
  members: { id: string; name: string; email: string; avatarUrl?: string }[];
  projectKey: string;
  onUpdate?: (updatedItem: DetailWorkItem) => void;
  canEdit?: boolean;
}

const PRIORITY_VALUES = Object.values(PRIORITIES) as Priority[];
const WORK_ITEM_TYPE_VALUES = Object.values(WORK_ITEM_TYPES) as WorkItemType[];

function normalizeWorkItemTypeValue(type: string): WorkItemType {
  const normalized = (type ?? "").trim().toUpperCase();
  switch (normalized) {
    case "EPIC":
      return WORK_ITEM_TYPES.module;
    case "STORY":
      return WORK_ITEM_TYPES.story;
    case "TASK":
      return WORK_ITEM_TYPES.task;
    case "BUG":
      return WORK_ITEM_TYPES.bug;
    case "SUB_TASK":
    case "SUBTASK":
      return WORK_ITEM_TYPES.subTask;
    case "MODULE":
    default:
      return WORK_ITEM_TYPES.module;
  }
}

function formatDate(iso?: string) {
  if (!iso) return null;
  return format(new Date(iso), "PPP", { locale: vi });
}

function normalizeDetailWorkItem(item: DetailWorkItem): DetailWorkItem {
  const normalizedStartDate = item.startDate ?? item.startedAt;
  return {
    ...item,
    startDate: normalizedStartDate,
    startedAt: normalizedStartDate,
    labels: item.labels ?? [],
  };
}

function labelsToString(labels?: string[]) {
  return (labels ?? []).join(", ");
}

function parseLabels(value: string) {
  return value
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

// ─── Inline editable text / textarea ───────────────────────────────────────
function InlineTextField({
  value,
  onSave,
  multiline = false,
  placeholder = "Nhấp để chỉnh sửa…",
  className,
  disabled = false,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  async function commit() {
    const trimmed = draft.trim();
    if (trimmed === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      void commit();
    }
    if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
  }

  if (editing && !disabled) {
    const sharedProps = {
      value: draft,
      onChange: (
        e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
      ) => setDraft(e.target.value),
      onBlur: () => void commit(),
      onKeyDown,
      disabled: saving,
      className: cn(
        "w-full resize-none rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm ring-2 ring-primary/20 focus:outline-none",
        className,
      ),
    };
    return multiline ? (
      <textarea
        {...(sharedProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        ref={ref as React.Ref<HTMLTextAreaElement>}
        rows={4}
      />
    ) : (
      <input
        {...(sharedProps as React.InputHTMLAttributes<HTMLInputElement>)}
        ref={ref as React.Ref<HTMLInputElement>}
        type="text"
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && setEditing(true)}
      onFocus={() => !disabled && setEditing(true)}
      className={cn(
        "group relative rounded-lg px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/30",
        disabled ? "cursor-default" : "cursor-text hover:bg-muted/30",
        !value && "italic text-muted-foreground",
        className,
      )}
    >
      {value || placeholder}
      {!disabled && (
        <Pencil className="absolute right-2 top-2.5 size-3 text-muted-foreground opacity-0 transition group-hover:opacity-60" />
      )}
    </div>
  );
}

// ─── Inline editable number ─────────────────────────────────────────────────
function InlineNumberField({
  value,
  onSave,
  placeholder = "—",
  disabled = false,
}: {
  value?: number;
  onSave: (next: number | null) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value?.toString() ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  async function commit() {
    const num = draft === "" ? null : parseInt(draft, 10);
    setEditing(false);
    await onSave(isNaN(num as number) ? null : num);
  }

  if (editing && !disabled) {
    return (
      <input
        ref={ref}
        type="number"
        min={0}
        max={100}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-20 rounded border border-primary/40 bg-background px-2 py-0.5 text-right text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => !disabled && setEditing(true)}
      className={cn(
        "rounded px-1 font-mono text-sm font-semibold focus:outline-none",
        disabled ? "cursor-default" : "cursor-text hover:bg-muted/40",
      )}
    >
      {value !== undefined ? (
        value
      ) : (
        <span className="text-muted-foreground italic text-sm">
          {placeholder}
        </span>
      )}
    </span>
  );
}

// ─── Inline editable date ────────────────────────────────────────────────────
function InlineDateField({
  value,
  onSave,
  placeholder = "Chọn ngày",
  disabled = false,
}: {
  value?: string;
  onSave: (next: string | null) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const dateValue = value ? new Date(value) : undefined;

  if (disabled) {
    return (
      <span className={cn("text-sm font-medium", !dateValue && "text-muted-foreground italic")}>
        {dateValue ? format(dateValue, "PPP", { locale: vi }) : placeholder}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto justify-start rounded px-1 py-0 text-left text-sm font-medium hover:bg-muted/40",
            !dateValue && "text-muted-foreground italic",
          )}
          type="button"
        >
          {dateValue ? format(dateValue, "PPP", { locale: vi }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(date) => {
            void onSave(date ? format(date, "yyyy-MM-dd") : null);
          }}
          defaultMonth={dateValue}
          locale={vi}
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── Property row card ───────────────────────────────────────────────────────
function PropRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border px-4 py-3 flex items-center justify-between gap-4 min-h-13">
      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap shrink-0">
        {label}
      </span>
      <div className="flex items-center justify-end">{children}</div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export function WorkItemDetailDrawer({
  item,
  open,
  onOpenChange,
  statuses,
  members,
  projectKey,
  onUpdate,
  canEdit = false,
}: WorkItemDetailDrawerProps) {
  const [updating, setUpdating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (!item) return null;

  const normalizedItem = normalizeDetailWorkItem(item);
  const labels = normalizedItem.labels ?? [];
  const normalizedTypeValue = normalizeWorkItemTypeValue(normalizedItem.type);

  const activeStatus = statuses.find((s) => s.id === normalizedItem.statusId);
  const activeAssignee = normalizedItem.assigneeId
    ? members.find((member) => member.id === normalizedItem.assigneeId)
    : null;

  async function patch(fields: Record<string, unknown>) {
    const optimisticItem = normalizeDetailWorkItem({
      ...normalizedItem,
      ...fields,
    } as DetailWorkItem);
    onUpdate?.(optimisticItem);
    try {
      const savedItem = await apiRequest<DetailWorkItem>(
        `/api/work-items/${normalizedItem.key}`,
        {
          method: "PATCH",
          body: JSON.stringify(fields),
        },
      );
      onUpdate?.(normalizeDetailWorkItem(savedItem));
    } catch (error) {
      onUpdate?.(normalizedItem);
      throw error;
    }
  }

  async function handleStatusChange(statusId: string) {
    setUpdating(true);
    try {
      await apiRequest(`/api/work-items/${normalizedItem.key}/status`, {
        method: "PATCH",
        body: JSON.stringify({ statusId }),
      });
      onUpdate?.(normalizeDetailWorkItem({ ...normalizedItem, statusId }));
    } catch (err) {
      console.error("Lỗi đổi trạng thái:", err);
    } finally {
      setUpdating(false);
    }
  }

  async function handleAssigneeChange(assigneeId: string) {
    setUpdating(true);
    const finalId = assigneeId === "unassigned" ? null : assigneeId;
    try {
      await apiRequest(
        `/api/projects/${projectKey}/work-items/${normalizedItem.key}/assign`,
        { method: "PATCH", body: JSON.stringify({ assigneeId: finalId }) },
      );
      onUpdate?.(
        normalizeDetailWorkItem({
          ...normalizedItem,
          assigneeId: finalId || undefined,
        }),
      );
    } catch (err) {
      console.error("Lỗi gán người dùng:", err);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent className="bg-card text-foreground shadow-2xl">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {/* ── Header ── */}
          <div className="shrink-0 px-6 pt-6 pb-5 border-b">
            {/* Eyebrow: key · type · status pill */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <WorkItemTypeIcon type={normalizedItem.type} size={14} />
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {normalizedItem.key}
                </span>
              </div>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-xs text-muted-foreground capitalize">
                {WORK_ITEM_TYPE_LABELS[normalizedItem.type] ??
                  normalizedItem.type}
              </span>
              {activeStatus && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: activeStatus.color ?? "#64748b" }}
                  >
                    {activeStatus.name}
                  </span>
                </>
              )}
            </div>

            {/* Bold title — editable summary */}
            <DrawerTitle asChild>
              <div className="-mx-3">
                <InlineTextField
                  value={normalizedItem.summary}
                  onSave={async (v) => {
                    await patch({ summary: v });
                  }}
                  className="text-xl font-bold leading-snug text-foreground"
                  disabled={!canEdit}
                />
              </div>
            </DrawerTitle>

            {/* Muted subtitle — description snippet */}
            {normalizedItem.description && (
              <p className="mt-2 line-clamp-2 px-1 text-sm text-muted-foreground leading-relaxed">
                {normalizedItem.description}
              </p>
            )}
          </div>

          {/* ── Scrollable body ── */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5">
            <div className="flex flex-col gap-2.5">
              <PropRow label="Loại công việc">
                <Select
                  value={normalizedTypeValue}
                  onValueChange={async (value) => {
                    await patch({ type: value });
                  }}
                  disabled={updating || !canEdit}
                >
                  <SelectTrigger className="h-8 w-auto border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_ITEM_TYPE_VALUES.map((type) => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <WorkItemTypeIcon type={type} size={14} />
                          <span>{WORK_ITEM_TYPE_LABELS[type] ?? type}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropRow>

              {/* Status */}
              <PropRow label="Trạng thái">
                <Select
                  value={normalizedItem.statusId}
                  onValueChange={handleStatusChange}
                  disabled={updating || !canEdit}
                >
                  <SelectTrigger className="h-8 w-auto border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                    {/* <span
                      className="mr-1.5 inline-block size-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: activeStatus?.color ?? "#64748b",
                      }}
                    /> */}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ backgroundColor: s.color ?? "#64748b" }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropRow>

              {/* Assignee */}
              <PropRow label="Người thực hiện">
                <Select
                  value={normalizedItem.assigneeId ?? "unassigned"}
                  onValueChange={handleAssigneeChange}
                  disabled={updating || !canEdit}
                >
                  <SelectTrigger className="h-8 w-auto border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                    {activeAssignee ? (
                      <MemberIdentity
                        name={activeAssignee.name}
                        avatarUrl={activeAssignee.avatarUrl}
                        email={activeAssignee.email}
                      />
                    ) : (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <User className="size-3.5" /> Chưa gán
                      </span>
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <User className="size-3.5" /> Chưa gán
                      </span>
                    </SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <MemberIdentity
                          name={m.name}
                          avatarUrl={m.avatarUrl}
                          email={m.email}
                        />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropRow>

              {/* Priority */}
              <PropRow label="Độ ưu tiên">
                <Select
                  value={normalizedItem.priority}
                  onValueChange={async (v) => {
                    await patch({ priority: v });
                  }}
                  disabled={updating || !canEdit}
                >
                  <SelectTrigger className="h-8 w-auto border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_VALUES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <PriorityIcon priority={p} className="size-3.5" />
                          <span>{PRIORITY_LABELS[p] ?? p}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PropRow>

              {/* Story Points */}
              <PropRow label="Story Points">
                <InlineNumberField
                  value={normalizedItem.storyPoints}
                  onSave={async (v) => {
                    await patch({ storyPoints: v });
                  }}
                  disabled={!canEdit}
                />
              </PropRow>

              {/* Dates — two separate cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border px-4 py-3">
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Play className="size-3" /> Bắt đầu
                  </p>
                  <InlineDateField
                    value={normalizedItem.startDate}
                    placeholder="Chọn ngày"
                    onSave={async (v) => {
                      await patch({ startDate: v });
                    }}
                    disabled={!canEdit}
                  />
                </div>
                <div className="rounded-xl border px-4 py-3">
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <CalendarIcon className="size-3" /> Hạn chót
                  </p>
                  <InlineDateField
                    value={normalizedItem.dueDate}
                    placeholder="Chọn ngày"
                    onSave={async (v) => {
                      await patch({ dueDate: v });
                    }}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* Description card */}
              <div className="rounded-xl border overflow-hidden">
                <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="size-3.5" /> Mô tả chi tiết
                </p>
                <div className="-mt-1">
                  <InlineTextField
                    value={normalizedItem.description ?? ""}
                    onSave={async (v) => {
                      await patch({ description: v });
                    }}
                    multiline
                    placeholder="Nhấp để thêm mô tả…"
                    className="min-h-20 w-full px-4 pb-3 text-sm leading-relaxed"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* Labels */}
              <div className="rounded-xl border overflow-hidden">
                <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="size-3.5" /> Nhãn
                </p>
                <div className="-mt-1 border-b">
                  <InlineTextField
                    value={labelsToString(labels)}
                    onSave={async (value) => {
                      await patch({ labels: parseLabels(value) });
                    }}
                    placeholder="frontend, urgent, qa"
                    className="w-full px-4 pb-3 text-sm leading-relaxed"
                    disabled={!canEdit}
                  />
                </div>
                {labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-4 py-3">
                    {labels.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Figma Links */}
              {normalizedItem.figmaLinks &&
                normalizedItem.figmaLinks.length > 0 && (
                  <div className="rounded-xl border px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Figma className="size-3.5 text-purple-400" /> Figma
                      Designs
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {normalizedItem.figmaLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-sm font-medium hover:bg-muted/30 transition"
                        >
                          <Link2 className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {link.label || "Figma Link"}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

              {/* Document Links */}
              {normalizedItem.documentLinks &&
                normalizedItem.documentLinks.length > 0 && (
                  <div className="rounded-xl border px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5 text-blue-400" /> Tài liệu
                      đính kèm
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {normalizedItem.documentLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-sm font-medium hover:bg-muted/30 transition"
                        >
                          <Link2 className="size-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {link.label || "Tài liệu"}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 border-t px-6 py-4">
            <DrawerClose asChild>
              <Button
                variant="outline"
                className="w-full rounded-xl h-11 font-semibold text-sm"
              >
                Đóng
              </Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
