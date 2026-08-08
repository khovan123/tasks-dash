"use client";

import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Figma,
  FileText,
  Play,
  Tag,
  User,
} from "lucide-react";
import {
  WorkItemTypeIcon,
  WORK_ITEM_TYPE_LABELS,
} from "@/components/atoms/work-item-type-icon";
import {
  PriorityIcon,
  PRIORITY_LABELS,
} from "@/components/atoms/priority-icon";
import {
  InlineEditableDate,
  InlineEditableNumber,
  InlineEditableText,
} from "@/components/molecules/inline-editable-field";
import { MemberInfoBadge } from "@/components/molecules/member-info-badge";
import {
  ResourceLinksCard,
  WorkItemPropertyRow,
} from "@/components/molecules/work-item-detail-parts";
import { useWorkItemMutations } from "@/features/work-items/hooks/use-work-item-mutations";
import {
  normalizeDetailWorkItem,
  normalizeWorkItemTypeValue,
  PRIORITY_VALUES,
  WORK_ITEM_TYPE_VALUES,
} from "@/features/work-items/lib/work-item-values";
import type {
  DetailWorkItem,
  WorkflowStatusView,
  WorkItemMember,
} from "@/features/work-items/types";
import {
  parseCommaSeparatedValues,
  serializeCommaSeparatedValues,
} from "@/lib/text-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface WorkItemDetailDrawerProps {
  item: DetailWorkItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: WorkflowStatusView[];
  members: WorkItemMember[];
  projectKey: string;
  onUpdate?: (updatedItem: DetailWorkItem) => void;
  canEdit?: boolean;
}

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
  const [isMobile, setIsMobile] = useState(false);
  const mutations = useWorkItemMutations({ projectKey, onUpdate });

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    setIsMobile(query.matches);
    const listener = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  if (!item) return null;

  const normalizedItem = normalizeDetailWorkItem(item);
  const normalizedType = normalizeWorkItemTypeValue(normalizedItem.type);
  const activeStatus = statuses.find((status) => status.id === normalizedItem.statusId);
  const activeAssignee = normalizedItem.assigneeId
    ? members.find((member) => member.id === normalizedItem.assigneeId)
    : null;

  async function patch(fields: Record<string, unknown>): Promise<void> {
    await mutations.patch(normalizedItem, fields);
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) mutations.clearError();
        onOpenChange(nextOpen);
      }}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent className="bg-card text-foreground shadow-2xl">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b px-6 pb-5 pt-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <WorkItemTypeIcon type={normalizedType} size={14} />
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {normalizedItem.key}
                </span>
              </div>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-xs capitalize text-muted-foreground">
                {WORK_ITEM_TYPE_LABELS[normalizedType] ?? normalizedType}
              </span>
              {activeStatus ? (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                    style={{ backgroundColor: activeStatus.color ?? "#64748b" }}
                  >
                    {activeStatus.name}
                  </span>
                </>
              ) : null}
            </div>
            <DrawerTitle asChild>
              <div className="-mx-3">
                <InlineEditableText
                  value={normalizedItem.summary}
                  onSave={(value) => patch({ summary: value })}
                  className="text-xl font-bold leading-snug text-foreground"
                  disabled={!canEdit}
                />
              </div>
            </DrawerTitle>
            {normalizedItem.description ? (
              <p className="mt-2 line-clamp-2 px-1 text-sm leading-relaxed text-muted-foreground">
                {normalizedItem.description}
              </p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-2.5">
              {mutations.error ? (
                <Alert variant="destructive">
                  <AlertTitle>Không thể cập nhật work item</AlertTitle>
                  <AlertDescription>{mutations.error}</AlertDescription>
                </Alert>
              ) : null}

              <WorkItemPropertyRow label="Loại công việc">
                <Select
                  value={normalizedType}
                  onValueChange={(value) => void patch({ type: value })}
                  disabled={mutations.pending || !canEdit}
                >
                  <SelectTrigger className="h-8 w-auto border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_ITEM_TYPE_VALUES.map((type) => (
                      <SelectItem key={type} value={type}>
                        <span className="flex items-center gap-2">
                          <WorkItemTypeIcon type={type} size={14} />
                          {WORK_ITEM_TYPE_LABELS[type] ?? type}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </WorkItemPropertyRow>

              <WorkItemPropertyRow label="Trạng thái">
                <Select
                  value={normalizedItem.statusId}
                  onValueChange={(statusId) =>
                    void mutations.changeStatus(normalizedItem, statusId)
                  }
                  disabled={mutations.pending || !canEdit}
                >
                  <SelectTrigger className="h-8 w-auto border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ backgroundColor: status.color ?? "#64748b" }}
                          />
                          {status.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </WorkItemPropertyRow>

              <WorkItemPropertyRow label="Người thực hiện">
                <Select
                  value={normalizedItem.assigneeId ?? "unassigned"}
                  onValueChange={(value) =>
                    void mutations.assign(
                      normalizedItem,
                      value === "unassigned" ? null : value,
                    )
                  }
                  disabled={mutations.pending || !canEdit}
                >
                  <SelectTrigger className="h-8 w-auto border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                    {activeAssignee ? (
                      <MemberInfoBadge
                        memberId={activeAssignee.id}
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
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <MemberInfoBadge
                          memberId={member.id}
                          name={member.name}
                          avatarUrl={member.avatarUrl}
                          email={member.email}
                        />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </WorkItemPropertyRow>

              <WorkItemPropertyRow label="Độ ưu tiên">
                <Select
                  value={normalizedItem.priority}
                  onValueChange={(value) => void patch({ priority: value })}
                  disabled={mutations.pending || !canEdit}
                >
                  <SelectTrigger className="h-8 w-auto border-none bg-transparent px-2 text-sm font-semibold shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_VALUES.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        <span className="flex items-center gap-2">
                          <PriorityIcon priority={priority} className="size-3.5" />
                          {PRIORITY_LABELS[priority] ?? priority}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </WorkItemPropertyRow>

              <WorkItemPropertyRow label="Story Points">
                <InlineEditableNumber
                  value={normalizedItem.storyPoints}
                  onSave={(value) => patch({ storyPoints: value })}
                  disabled={!canEdit}
                />
              </WorkItemPropertyRow>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border px-4 py-3">
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Play className="size-3" /> Bắt đầu
                  </p>
                  <InlineEditableDate
                    value={normalizedItem.startDate}
                    onSave={(value) => patch({ startDate: value })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="rounded-xl border px-4 py-3">
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <CalendarIcon className="size-3" /> Hạn chót
                  </p>
                  <InlineEditableDate
                    value={normalizedItem.dueDate}
                    onSave={(value) => patch({ dueDate: value })}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <p className="flex items-center gap-1.5 px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="size-3.5" /> Mô tả chi tiết
                </p>
                <div className="-mt-1">
                  <InlineEditableText
                    value={normalizedItem.description ?? ""}
                    onSave={(value) => patch({ description: value })}
                    multiline
                    placeholder="Nhấp để thêm mô tả…"
                    className="min-h-20 w-full px-4 pb-3 text-sm leading-relaxed"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border">
                <p className="flex items-center gap-1.5 px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Tag className="size-3.5" /> Nhãn
                </p>
                <div className="-mt-1 border-b">
                  <InlineEditableText
                    value={serializeCommaSeparatedValues(normalizedItem.labels)}
                    onSave={(value) => patch({ labels: parseCommaSeparatedValues(value) })}
                    placeholder="frontend, urgent, qa"
                    className="w-full px-4 pb-3 text-sm leading-relaxed"
                    disabled={!canEdit}
                  />
                </div>
                {normalizedItem.labels?.length ? (
                  <div className="flex flex-wrap gap-1.5 px-4 py-3">
                    {normalizedItem.labels.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <ResourceLinksCard
                title="Figma Designs"
                icon={Figma}
                links={normalizedItem.figmaLinks}
                fallbackLabel="Figma Link"
              />
              <ResourceLinksCard
                title="Tài liệu đính kèm"
                icon={FileText}
                links={normalizedItem.documentLinks}
                fallbackLabel="Tài liệu"
              />
            </div>
          </div>

          <div className="shrink-0 border-t px-6 py-4">
            <DrawerClose asChild>
              <Button variant="outline" className="h-11 w-full rounded-xl text-sm font-semibold">
                Đóng
              </Button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
