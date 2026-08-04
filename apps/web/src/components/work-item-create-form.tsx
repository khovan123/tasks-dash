"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PRIORITIES, WORK_ITEM_TYPES } from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import {
  WorkItemFormInput,
  WorkItemFormValues,
  workItemFormSchema,
} from "@/features/work-items/schemas/work-item-form.schema";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
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
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

interface WorkflowStatus {
  id: string;
  name: string;
}
interface WorkspaceMemberOption {
  id: string;
  name: string;
  email: string;
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
  labels: "",
  figmaLinks: [],
  documentLinks: [],
};

export function WorkItemCreateForm({
  projectKey,
  statuses,
  members,
}: {
  projectKey: string;
  statuses: WorkflowStatus[];
  members: WorkspaceMemberOption[];
}) {
  const router = useRouter();
  const form = useForm<WorkItemFormInput, unknown, WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      ...EMPTY_FORM,
      statusId: statuses[0]?.id ?? "",
    },
  });
  const figma = useFieldArray({ control: form.control, name: "figmaLinks" });
  const documents = useFieldArray({ control: form.control, name: "documentLinks" });

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
          statusId: values.statusId || undefined,
          assigneeId: values.assigneeId || undefined,
          storyPoints: values.storyPoints,
          dueDate: values.dueDate || undefined,
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
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Không thể tạo work item.",
      });
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(submit)} noValidate>
        <FormCard
          eyebrow="Create work item"
          title="Thêm Task, Module hoặc Bug"
          description="Metadata được lưu vào MongoDB; Figma component và document link đều hỗ trợ nhiều URL tùy chọn."
          footer={
            <Button disabled={form.formState.isSubmitting}>
              <Plus />
              {form.formState.isSubmitting ? "Đang tạo…" : "Tạo work item"}
            </Button>
          }
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="work-item-type">Loại</FieldLabel>
              <NativeSelect id="work-item-type" {...form.register("type")}>
                {Object.values(WORK_ITEM_TYPES).map((type) => (
                  <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="work-item-priority">Priority</FieldLabel>
              <NativeSelect id="work-item-priority" {...form.register("priority")}>
                {Object.values(PRIORITIES).map((priority) => (
                  <NativeSelectOption key={priority} value={priority}>{priority}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel htmlFor="work-item-summary">Summary</FieldLabel>
            <Input id="work-item-summary" {...form.register("summary")} placeholder="Mô tả ngắn work item" />
          </Field>
          <Field>
            <FieldLabel htmlFor="work-item-description">Description</FieldLabel>
            <Textarea id="work-item-description" {...form.register("description")} placeholder="Acceptance criteria hoặc mô tả chi tiết" />
          </Field>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="work-item-status">Status</FieldLabel>
              <NativeSelect id="work-item-status" {...form.register("statusId")}>
                <NativeSelectOption value="">Backend default</NativeSelectOption>
                {statuses.map((status) => (
                  <NativeSelectOption key={status.id} value={status.id}>{status.name}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="work-item-assignee">Assignee</FieldLabel>
              <NativeSelect id="work-item-assignee" {...form.register("assigneeId")}>
                <NativeSelectOption value="">Chưa gán</NativeSelectOption>
                {members.map((member) => (
                  <NativeSelectOption key={member.id} value={member.id}>
                    {member.name} · {member.email}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="work-item-points">Story points</FieldLabel>
              <Input id="work-item-points" type="number" min="0" max="100" {...form.register("storyPoints")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="work-item-due-date">Due date</FieldLabel>
              <Input id="work-item-due-date" type="date" {...form.register("dueDate")} />
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel htmlFor="work-item-labels">Labels</FieldLabel>
            <Input id="work-item-labels" {...form.register("labels")} placeholder="frontend, urgent, release-1" />
            <FieldDescription>Phân tách nhiều label bằng dấu phẩy.</FieldDescription>
          </Field>

          <FieldSet>
            <FieldLegend>Figma component · optional · many</FieldLegend>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" type="button" onClick={() => figma.append({ label: "", url: "" })}>
                <Plus /> Thêm link
              </Button>
            </div>
            {figma.fields.length === 0 ? (
              <FieldDescription>Chưa gắn Figma component.</FieldDescription>
            ) : (
              <div className="grid gap-3">
                {figma.fields.map((field, index) => (
                  <div className="grid gap-2 md:grid-cols-[minmax(0,.7fr)_minmax(0,1.6fr)_auto]" key={field.id}>
                    <Input {...form.register(`figmaLinks.${index}.label`)} placeholder="Tên component" />
                    <Input {...form.register(`figmaLinks.${index}.url`)} placeholder="https://www.figma.com/..." />
                    <Button variant="destructive" size="icon" type="button" aria-label="Xóa Figma link" onClick={() => figma.remove(index)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FieldSet>

          <FieldSet>
            <FieldLegend>Docs links · optional · many</FieldLegend>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" type="button" onClick={() => documents.append({ label: "", url: "" })}>
                <Plus /> Thêm link
              </Button>
            </div>
            {documents.fields.length === 0 ? (
              <FieldDescription>Chưa gắn tài liệu.</FieldDescription>
            ) : (
              <div className="grid gap-3">
                {documents.fields.map((field, index) => (
                  <div className="grid gap-2 md:grid-cols-[minmax(0,.7fr)_minmax(0,1.6fr)_auto]" key={field.id}>
                    <Input {...form.register(`documentLinks.${index}.label`)} placeholder="Tên tài liệu" />
                    <Input {...form.register(`documentLinks.${index}.url`)} placeholder="https://docs.google.com/..." />
                    <Button variant="destructive" size="icon" type="button" aria-label="Xóa document link" onClick={() => documents.remove(index)}>
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FieldSet>

          {form.formState.errors.root?.message ? (
            <FieldError>{form.formState.errors.root.message}</FieldError>
          ) : null}
        </FormCard>
      </form>
    </FormProvider>
  );
}
