"use client";

import { useState } from "react";
import { AlertTriangle, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormCard } from "@/components/organisms/form-card";
import { apiRequest } from "@/lib/api/api-request";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface ProjectSettingsFormProps {
  project: {
    key: string;
    name: string;
    description?: string;
    color?: string;
  };
}

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [confirmKey, setConfirmKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest(`/api/projects/${project.key}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });
      setSuccess("Đã cập nhật thông tin dự án thành công.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật dự án.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (confirmKey.trim().toUpperCase() !== project.key.toUpperCase()) return;
    setDeleting(true);
    setError(null);
    try {
      await apiRequest(`/api/projects/${project.key}`, { method: "DELETE" });
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa dự án.");
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Lỗi xử lý</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success">
          <AlertTitle>Thành công</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleUpdate} noValidate>
        <FormCard
          eyebrow="Cấu hình chung"
          title="Thông tin dự án"
          description="Thay đổi tên hiển thị và mô tả phạm vi cho dự án này."
          footer={
            <Button disabled={saving || !name.trim()} type="submit" className="gap-1.5">
              <Save data-icon="inline-start" />
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
          }
        >
          <FieldGroup className="flex max-w-2xl flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="project-key-readonly">Mã dự án (Key)</FieldLabel>
              <Input
                id="project-key-readonly"
                value={project.key}
                disabled
                className="bg-muted font-mono font-bold"
              />
              <FieldDescription>
                Mã định danh duy nhất của dự án, không thể thay đổi sau khi tạo.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-proj-name">Tên dự án *</FieldLabel>
              <Input
                id="edit-proj-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nhập tên dự án..."
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-proj-desc">Mô tả dự án</FieldLabel>
              <Textarea
                id="edit-proj-desc"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Mô tả chi tiết mục tiêu và quy trình công việc của dự án…"
              />
            </Field>
          </FieldGroup>
        </FormCard>
      </form>

      <FormCard
        eyebrow="Vùng nguy hiểm"
        title="Xóa dự án"
        description="Hành động này sẽ xóa vĩnh viễn dự án cùng toàn bộ công việc, tài liệu, quy trình tự động liên quan."
      >
        <div className="flex flex-col gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="size-5" /> Cảnh báo hành động không thể hoàn tác
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nhập đúng mã dự án{" "}
            <strong className="font-mono text-foreground">{project.key}</strong>{" "}
            để mở khóa thao tác xóa.
          </p>
          <Field>
            <Input
              value={confirmKey}
              onChange={(event) => setConfirmKey(event.target.value)}
              placeholder={`Nhập ${project.key} để xác nhận xóa`}
              className="max-w-md border-destructive/30 bg-background font-mono text-sm uppercase"
            />
          </Field>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={
                  confirmKey.trim().toUpperCase() !== project.key.toUpperCase() || deleting
                }
                className="gap-1.5"
              >
                <Trash2 data-icon="inline-start" />
                {deleting ? "Đang xóa dự án…" : `Xóa vĩnh viễn dự án ${project.key}`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa dự án {project.key}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Toàn bộ dữ liệu của {project.name} ({project.key}), gồm công việc,
                  tài liệu và automation rule, sẽ bị xóa vĩnh viễn.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleDelete()}
                  variant="destructive"
                >
                  Xác nhận xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </FormCard>
    </div>
  );
}
