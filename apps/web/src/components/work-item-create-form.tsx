"use client";

import { useState, useMemo, useEffect } from "react";
import { type DateRange } from "react-day-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { PRIORITIES, WORK_ITEM_TYPES } from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ChevronDown as ChevronDownIcon,
  Plus,
  Trash2,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  WorkItemTypeIcon,
  WORK_ITEM_TYPE_LABELS,
} from "@/components/work-item-type-icon";
import { PriorityIcon, PRIORITY_LABELS } from "@/components/priority-icon";
import { MemberIdentity } from "@/components/member-identity";
import {
  WorkItemFormInput,
  WorkItemFormValues,
  workItemFormSchema,
} from "@/features/work-items/schemas/work-item-form.schema";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface WorkflowStatus {
  id: string;
  name: string;
}
interface WorkspaceMemberOption {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

const EMPTY_FORM: WorkItemFormInput = {
  type: WORK_ITEM_TYPES.task,
  summary: "",
  description: "",
  statusId: "",
  priority: PRIORITIES.medium,
  assigneeId: "",
  storyPoints: undefined,
  dueDate: "",
  startDate: "",
  labels: "",
  figmaLinks: [],
  documentLinks: [],
};

function LabelsInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const tags = useMemo(() => {
    return value
      ? value
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];
  }, [value]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().replace(/,/g, "");
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      onChange(newTags.join(", "));
    }
    setInputValue("");
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(newTags.join(", "));
  };

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg bg-muted/20 min-h-11 items-center">
          {tags.map((tag, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="flex items-center gap-1 pr-1 pl-2.5 py-0.5 text-xs"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="rounded-full hover:bg-muted p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Input
        value={inputValue}
        onChange={(e) => {
          const val = e.target.value;
          if (val.endsWith(",")) {
            addTag(val);
          } else {
            setInputValue(val);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag(inputValue);
          } else if (
            (e.key === "Backspace" || e.key === "Delete") &&
            !inputValue &&
            tags.length > 0
          ) {
            e.preventDefault();
            removeTag(tags.length - 1);
          }
        }}
        placeholder="Nhập tên tag rồi ấn Enter để thêm tag mới..."
      />
    </div>
  );
}

export function WorkItemCreateForm({
  projectKey,
  statuses,
  members,
  sprintId,
  onSuccess,
  inlineMode = false,
}: {
  projectKey: string;
  statuses: WorkflowStatus[];
  members: WorkspaceMemberOption[];
  sprintId?: string | null;
  onSuccess?: () => void;
  inlineMode?: boolean;
}) {
  const router = useRouter();
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((payload) => {
        if (payload && payload.data && payload.data.userId) {
          setMyUserId(payload.data.userId);
        }
      })
      .catch(() => {});
  }, []);

  const form = useForm<WorkItemFormInput, unknown, WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      ...EMPTY_FORM,
      statusId: statuses[0]?.id ?? "",
    },
  });
  const figma = useFieldArray({ control: form.control, name: "figmaLinks" });
  const documents = useFieldArray({
    control: form.control,
    name: "documentLinks",
  });

  async function submit(values: WorkItemFormValues): Promise<void> {
    form.clearErrors("root");
    try {
      await apiRequest(`/api/projects/${projectKey}/work-items`, {
        method: "POST",
        body: JSON.stringify({
          type: values.type,
          summary: values.summary,
          description: values.description,
          priority: values.priority,
          sprintId: sprintId || undefined,
          statusId:
            values.statusId === "default_backend" || !values.statusId
              ? undefined
              : values.statusId,
          assigneeId:
            values.assigneeId === "unassigned" || !values.assigneeId
              ? undefined
              : values.assigneeId,
          storyPoints: values.storyPoints,
          dueDate: values.dueDate || undefined,
          startDate: values.startDate || undefined,
          labels: values.labels
            .split(",")
            .map((label) => label.trim())
            .filter(Boolean),
          figmaLinks: values.figmaLinks.filter((link) => link.url),
          documentLinks: values.documentLinks.filter((link) => link.url),
        }),
      });
      form.reset({
        ...EMPTY_FORM,
        statusId: statuses[0]?.id ?? "",
      });
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "Không thể tạo work item.",
      });
    }
  }

  const formFields = (
    <>
      <FieldGroup>
        <Field>
          <FieldLabel>Loại</FieldLabel>
          <WorkItemTypeSelector form={form} />
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
                        <PriorityIcon
                          priority={priority}
                          className="size-4 shrink-0"
                        />
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
          <div className="flex items-center justify-between w-full">
            <FieldLabel htmlFor="work-item-assignee">Assignee</FieldLabel>
            {myUserId && members.some((m) => m.id === myUserId) && (
              <button
                type="button"
                onClick={() => form.setValue("assigneeId", myUserId)}
                className="text-[11px] text-primary hover:underline font-semibold"
              >
                Gán cho tôi
              </button>
            )}
          </div>
          <Controller
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <Select
                onValueChange={(val) => {
                  if (val === "assign_to_me" && myUserId) {
                    field.onChange(myUserId);
                  } else {
                    field.onChange(val);
                  }
                }}
                value={field.value}
              >
                <SelectTrigger id="work-item-assignee" className="w-full">
                  <SelectValue placeholder="Chưa gán" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Chưa gán</SelectItem>
                  {myUserId && members.some((m) => m.id === myUserId) && (
                    <SelectItem value="assign_to_me">Gán cho tôi</SelectItem>
                  )}
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <MemberIdentity
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
          <FieldLabel htmlFor="work-item-date-range">
            Thời gian thực hiện
          </FieldLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="work-item-date-range"
                className="w-full justify-start px-2.5 font-normal text-left"
                type="button"
              >
                <CalendarIcon
                  data-icon="inline-start"
                  className="mr-2 size-4"
                />
                {form.watch("startDate") ? (
                  form.watch("dueDate") ? (
                    <>
                      {format(new Date(form.watch("startDate")), "dd/MM/yyyy", {
                        locale: vi,
                      })}{" "}
                      -{" "}
                      {format(new Date(form.watch("dueDate")), "dd/MM/yyyy", {
                        locale: vi,
                      })}
                    </>
                  ) : (
                    format(new Date(form.watch("startDate")), "dd/MM/yyyy", {
                      locale: vi,
                    })
                  )
                ) : (
                  <span>Chọn khoảng thời gian</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={
                  form.watch("startDate")
                    ? new Date(form.watch("startDate"))
                    : undefined
                }
                selected={{
                  from: form.watch("startDate")
                    ? new Date(form.watch("startDate"))
                    : undefined,
                  to: form.watch("dueDate")
                    ? new Date(form.watch("dueDate"))
                    : undefined,
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
          render={({ field }) => (
            <LabelsInput value={field.value} onChange={field.onChange} />
          )}
        />
        <FieldDescription>
          Nhập tên tag rồi ấn Enter để thêm tag mới. Ấn Delete để xóa.
        </FieldDescription>
      </Field>

      <FieldSet>
        <FieldLegend>Figma component · optional</FieldLegend>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => figma.append({ label: "", url: "" })}
          >
            <Plus data-icon="inline-start" /> Thêm link
          </Button>
        </div>
        {figma.fields.length === 0 ? (
          <FieldDescription>Chưa gắn Figma component.</FieldDescription>
        ) : (
          <div className="grid gap-3">
            {figma.fields.map((field, index) => (
              <div
                className="grid gap-2 md:grid-cols-[minmax(0,.7fr)_minmax(0,1.6fr)_auto]"
                key={field.id}
              >
                <Input
                  {...form.register(`figmaLinks.${index}.label`)}
                  placeholder="Tên component"
                />
                <Input
                  {...form.register(`figmaLinks.${index}.url`)}
                  placeholder="https://www.figma.com/..."
                />
                <Button
                  variant="destructive"
                  size="icon"
                  type="button"
                  aria-label="Xóa Figma link"
                  onClick={() => figma.remove(index)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </FieldSet>

      <FieldSet>
        <FieldLegend>Docs links · optional</FieldLegend>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => documents.append({ label: "", url: "" })}
          >
            <Plus data-icon="inline-start" /> Thêm link
          </Button>
        </div>
        {documents.fields.length === 0 ? (
          <FieldDescription>Chưa gắn tài liệu.</FieldDescription>
        ) : (
          <div className="grid gap-3">
            {documents.fields.map((field, index) => (
              <div
                className="grid gap-2 md:grid-cols-[minmax(0,.7fr)_minmax(0,1.6fr)_auto]"
                key={field.id}
              >
                <Input
                  {...form.register(`documentLinks.${index}.label`)}
                  placeholder="Tên tài liệu"
                />
                <Input
                  {...form.register(`documentLinks.${index}.url`)}
                  placeholder="https://docs.google.com/..."
                />
                <Button
                  variant="destructive"
                  size="icon"
                  type="button"
                  aria-label="Xóa document link"
                  onClick={() => documents.remove(index)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        )}
      </FieldSet>
    </>
  );

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        noValidate
        className="flex-1 flex flex-col min-h-0 max-h-[inherit]"
      >
        {inlineMode ? (
          <div className="flex-1 flex flex-col min-h-0 max-h-[inherit]">
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-5">
              {formFields}
              {form.formState.errors.root?.message ? (
                <FieldError className="mt-2">
                  {form.formState.errors.root.message}
                </FieldError>
              ) : null}
            </div>
            <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-3 bg-muted/20">
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
            {formFields}
            {form.formState.errors.root?.message ? (
              <FieldError>{form.formState.errors.root.message}</FieldError>
            ) : null}
          </FormCard>
        )}
      </form>
    </FormProvider>
  );
}

// ── WorkItemTypeSelector ──────────────────────────────────────────────────────
// A visual icon-button group used inside WorkItemCreateForm to pick work item type.

type FormInstance = ReturnType<
  typeof useForm<WorkItemFormInput, unknown, WorkItemFormValues>
>;

function WorkItemTypeSelector({ form }: { form: FormInstance }) {
  const current = useWatch({ control: form.control, name: "type" });

  return (
    <Controller
      control={form.control}
      name="type"
      render={({ field }) => (
        <Select onValueChange={field.onChange} value={field.value}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn loại công việc" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(WORK_ITEM_TYPES).map((type) => (
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
  );
}
