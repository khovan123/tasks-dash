"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PRIORITIES, WORK_ITEM_TYPES } from "@tasks-dash/contracts";
import { useRouter } from "next/navigation";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import {
  WorkItemFormInput,
  WorkItemFormValues,
  workItemFormSchema,
} from "@/features/work-items/schemas/work-item-form.schema";
import { apiRequest } from "@/lib/api/api-request";

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
      <form className="form-card" onSubmit={form.handleSubmit(submit)} noValidate>
        <div className="section-heading">
          <div><span>CREATE WORK ITEM</span><h2>Thêm Task, Module hoặc Bug</h2></div>
        </div>
        <div className="form-grid">
          <label>Loại<select {...form.register("type")}>{Object.values(WORK_ITEM_TYPES).map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label>Priority<select {...form.register("priority")}>{Object.values(PRIORITIES).map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <label className="wide">Summary<input {...form.register("summary")} placeholder="Mô tả ngắn work item" /></label>
          <label className="wide">Description<textarea {...form.register("description")} placeholder="Acceptance criteria hoặc mô tả chi tiết" /></label>
          <label>Status<select {...form.register("statusId")}><option value="">Backend default</option>{statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</select></label>
          <label>Assignee<select {...form.register("assigneeId")}><option value="">Chưa gán</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.email}</option>)}</select></label>
          <label>Story points<input type="number" min="0" max="100" {...form.register("storyPoints")} /></label>
          <label>Due date<input type="date" {...form.register("dueDate")} /></label>
          <label className="wide">Labels<input {...form.register("labels")} placeholder="frontend, urgent, release-1" /></label>
        </div>

        <div className="link-fieldset">
          <div className="section-heading"><div><span>OPTIONAL · MANY</span><h3>Figma component</h3></div><button className="secondary compact" type="button" onClick={() => figma.append({ label: "", url: "" })}>+ Thêm link</button></div>
          {figma.fields.length === 0 ? <p className="empty-inline">Chưa gắn Figma component.</p> : figma.fields.map((field, index) => <div className="link-row" key={field.id}><input {...form.register(`figmaLinks.${index}.label`)} placeholder="Tên component" /><input {...form.register(`figmaLinks.${index}.url`)} placeholder="https://www.figma.com/..." /><button className="danger-button" type="button" onClick={() => figma.remove(index)}>Xóa</button></div>)}
        </div>

        <div className="link-fieldset">
          <div className="section-heading"><div><span>OPTIONAL · MANY</span><h3>Docs links</h3></div><button className="secondary compact" type="button" onClick={() => documents.append({ label: "", url: "" })}>+ Thêm link</button></div>
          {documents.fields.length === 0 ? <p className="empty-inline">Chưa gắn tài liệu.</p> : documents.fields.map((field, index) => <div className="link-row" key={field.id}><input {...form.register(`documentLinks.${index}.label`)} placeholder="Tên tài liệu" /><input {...form.register(`documentLinks.${index}.url`)} placeholder="https://docs.google.com/..." /><button className="danger-button" type="button" onClick={() => documents.remove(index)}>Xóa</button></div>)}
        </div>

        {form.formState.errors.root?.message ? <p className="error">{form.formState.errors.root.message}</p> : null}
        <button className="primary" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Đang tạo…" : "Tạo work item"}</button>
      </form>
    </FormProvider>
  );
}
