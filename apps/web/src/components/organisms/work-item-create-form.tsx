"use client";

import { type DateRange } from "react-day-picker";
import { Controller, FormProvider } from "react-hook-form";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { PRIORITIES } from "@tasks-dash/contracts";
import {
  WorkItemTypeIcon,
  WORK_ITEM_TYPE_LABELS,
} from "@/components/atoms/work-item-type-icon";
import {
  PriorityIcon,
  PRIORITY_LABELS,
} from "@/components/atoms/priority-icon";
import { LinkFieldArray } from "@/components/molecules/link-field-array";
import { MemberInfoBadge } from "@/components/molecules/member-info-badge";
import { TagInput } from "@/components/molecules/tag-input";
import { FormCard } from "@/components/organisms/form-card";
import { useCreateWorkItemForm } from "@/features/work-items/hooks/use-create-work-item-form";
import {
  WORK_ITEM_TYPE_VALUES,
} from "@/features/work-items/lib/work-item-values";
import type {
  WorkflowStatusView,
  WorkItemMember,
} from "@/features/work-items/types";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";

export interface WorkItemCreateFormProps {
  projectKey: string;
  statuses: WorkflowStatusView[];
  members: WorkItemMember[];
  sprintId?: string | null;
  onSuccess?: () => void;
  inlineMode?: boolean;
}

export function WorkItemCreateForm({
  projectKey,
  statuses,
  members,
  sprintId,
  onSuccess,
  inlineMode = false,
}: WorkItemCreateFormProps) {
  const {
    assignToMe,
    canAssignToMe,
    documentLinks,
    figmaLinks,
    form,
    myUserId,
    submit,
  } = useCreateWorkItemForm({
    projectKey,
    statuses,
    members,
    sprintId,
    onSuccess,
  });

  const startDate = form.watch("startDate");
  const dueDate = form.watch("dueDate");

  const fields = (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel>Loại</FieldLabel>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn loại công việc" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_ITEM_TYPE_VALUES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <WorkItemTypeIcon type={type} size={15} />
                        <span>{WORK_ITEM_TYPE_LABELS[type]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="work-item-priority">Độ ưu tiên</FieldLabel>
          <Controller
            control={form.control}
            name="priority"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="work-item-priority" className="w-full">
                  <SelectValue placeholder="Chọn priority" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PRIORITIES).map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      <div className="flex items-center gap-2">
                        <PriorityIcon priority={priority} className="size-4 shrink-0" />
                        <span>{PRIORITY_LABELS[priority] ?? priority}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
      </FieldGroup>

      <Field>
        <FieldLabel htmlFor="work-item-summary">Summary</FieldLabel>
        <Input
          id="work-item-summary"
          {...form.register("summary")}
          placeholder="Mô tả ngắn work item"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="work-item-description">Description</FieldLabel>
        <Textarea
          id="work-item-description"
          {...form.register("description")}
          placeholder="Acceptance criteria hoặc mô tả chi tiết"
        />
      </Field>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="work-item-status">Status</FieldLabel>
          <Controller
            control={form.control}
            name="statusId"
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="work-item-status" className="w-full">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field>
          <div className="flex w-full items-center justify-between">
            <FieldLabel htmlFor="work-item-assignee">Assignee</FieldLabel>
            {canAssignToMe ? (
              <button
                type="button"
                onClick={assignToMe}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Gán cho tôi
              </button>
            ) : null}
          </div>
          <Controller
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <Select
                onValueChange={(value) => {
                  if (value === "assign_to_me" && myUserId) field.onChange(myUserId);
                  else field.onChange(value);
                }}
                value={field.value}
              >
                <SelectTrigger id="work-item-assignee" className="w-full">
                  <SelectValue placeholder="Chưa gán" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Chưa gán</SelectItem>
                  {canAssignToMe ? (
                    <SelectItem value="assign_to_me">Gán cho tôi</SelectItem>
                  ) : null}
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
            )}
          />
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="work-item-points">Story points</FieldLabel>
          <Input
            id="work-item-points"
            type="number"
            min="0"
            max="100"
            {...form.register("storyPoints")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="work-item-date-range">Thời gian thực hiện</FieldLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="work-item-date-range"
                className="w-full justify-start px-2.5 text-left font-normal"
                type="button"
              >
                <CalendarIcon className="mr-2 size-4" />
                {startDate ? (
                  dueDate ? (
                    <>
                      {format(new Date(startDate), "dd/MM/yyyy", { locale: vi })} -{" "}
                      {format(new Date(dueDate), "dd/MM/yyyy", { locale: vi })}
                    </>
                  ) : (
                    format(new Date(startDate), "dd/MM/yyyy", { locale: vi })
                  )
                ) : (
                  <span>Chọn khoảng thời gian</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={startDate ? new Date(startDate) : undefined}
                selected={{
                  from: startDate ? new Date(startDate) : undefined,
                  to: dueDate ? new Date(dueDate) : undefined,
                }}
                onSelect={(range: DateRange | undefined) => {
                  form.setValue(
                    "startDate",
                    range?.from ? format(range.from, "yyyy-MM-dd") : "",
                  );
                  form.setValue(
                    "dueDate",
                    range?.to ? format(range.to, "yyyy-MM-dd") : "",
                  );
                }}
                numberOfMonths={2}
                locale={vi}
              />
            </PopoverContent>
          </Popover>
        </Field>
      </FieldGroup>

      <Field>
        <FieldLabel htmlFor="work-item-labels">Labels</FieldLabel>
        <Controller
          control={form.control}
          name="labels"
          render={({ field }) => <TagInput value={field.value} onChange={field.onChange} />}
        />
        <FieldDescription>
          Nhập tên tag rồi ấn Enter để thêm tag mới. Ấn Delete để xóa.
        </FieldDescription>
      </Field>

      <LinkFieldArray
        title="Figma component · optional"
        emptyText="Chưa gắn Figma component."
        fields={figmaLinks.fields}
        labelPlaceholder="Tên component"
        urlPlaceholder="https://www.figma.com/..."
        removeLabel="Xóa Figma link"
        onAppend={() => figmaLinks.append({ label: "", url: "" })}
        onRemove={figmaLinks.remove}
        labelInputProps={(index) => form.register(`figmaLinks.${index}.label`)}
        urlInputProps={(index) => form.register(`figmaLinks.${index}.url`)}
      />

      <LinkFieldArray
        title="Docs links · optional"
        emptyText="Chưa gắn tài liệu."
        fields={documentLinks.fields}
        labelPlaceholder="Tên tài liệu"
        urlPlaceholder="https://docs.google.com/..."
        removeLabel="Xóa document link"
        onAppend={() => documentLinks.append({ label: "", url: "" })}
        onRemove={documentLinks.remove}
        labelInputProps={(index) => form.register(`documentLinks.${index}.label`)}
        urlInputProps={(index) => form.register(`documentLinks.${index}.url`)}
      />
    </>
  );

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="flex min-h-0 max-h-[inherit] flex-1 flex-col"
      >
        {inlineMode ? (
          <div className="flex min-h-0 max-h-[inherit] flex-1 flex-col">
            <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-6 py-4">
              {fields}
              {form.formState.errors.root?.message ? (
                <FieldError className="mt-2">{form.formState.errors.root.message}</FieldError>
              ) : null}
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t bg-muted/20 px-6 py-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                <Plus data-icon="inline-start" />
                {form.formState.isSubmitting ? "Đang tạo…" : "Tạo công việc"}
              </Button>
            </div>
          </div>
        ) : (
          <FormCard
            title="Thêm Task, Module hoặc Bug"
            description="Metadata được lưu; Figma component và document link đều hỗ trợ nhiều URL tùy chọn."
            footer={
              <Button disabled={form.formState.isSubmitting} type="submit">
                <Plus data-icon="inline-start" />
                {form.formState.isSubmitting ? "Đang tạo…" : "Tạo work item"}
              </Button>
            }
          >
            {fields}
            {form.formState.errors.root?.message ? (
              <FieldError>{form.formState.errors.root.message}</FieldError>
            ) : null}
          </FormCard>
        )}
      </form>
    </FormProvider>
  );
}
