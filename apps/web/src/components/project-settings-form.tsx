"use client";

import { useState } from "react";
import { AlertTriangle, Save, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api/api-request";
import { FormCard } from "@/components/layout/app-shell";
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
  FieldError,
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

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không thể cập nhật dự án.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (confirmKey.trim().toUpperCase() !== project.key.toUpperCase()) return;
    setDeleting(true);
    setError(null);
    try {
      await apiRequest(`/api/projects/${project.key}`, {
        method: "DELETE",
      });
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa dự án.");
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

      {/* Form Cập nhật thông tin dự án */}
      <form onSubmit={handleUpdate} noValidate>
        <FormCard
          eyebrow="Cấu hình chung"
          title="Thông tin dự án"
          description="Thay đổi tên hiển thị và mô tả phạm vi cho dự án này."
          footer={
            <Button
              disabled={saving || !name.trim()}
              type="submit"
              className="gap-1.5"
            >
              <Save data-icon="inline-start" />
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </Button>
          }
        >
          <FieldGroup className="flex flex-col gap-4 max-w-2xl">
            <Field>
              <FieldLabel htmlFor="project-key-readonly">
                Mã dự án (Key)
              </FieldLabel>
              <Input
                id="project-key-readonly"
                value={project.key}
                disabled
                className="font-mono bg-muted font-bold"
              />
              <FieldDescription>
                Mã định danh duy nhất của dự án (không thể thay đổi sau khi
                tạo).
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-proj-name">Tên dự án *</FieldLabel>
              <Input
                id="edit-proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết mục tiêu và quy trình công việc của dự án…"
              />
            </Field>
          </FieldGroup>
        </FormCard>
      </form>

      {/* Form Xóa dự án (Danger Zone) */}
      <FormCard
        eyebrow="Vùng nguy hiểm"
        title="Xóa dự án"
        description="Hành động này sẽ xóa vĩnh viễn dự án cùng toàn bộ công việc, tài liệu, quy trình tự động liên quan."
      >
        <div className="flex flex-col gap-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="size-5" />
            Cảnh báo hành động không thể hoàn tác
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vui lòng nhập đúng mã dự án{" "}
            <strong className="text-foreground font-mono">{project.key}</strong>{" "}
            vào ô bên dưới để mở khóa thao tác xóa dự án.
          </p>

          <Field>
            <Input
              value={confirmKey}
              onChange={(e) => setConfirmKey(e.target.value)}
              placeholder={`Nhập ${project.key} để xác nhận xóa`}
              className="font-mono text-sm uppercase bg-background border-destructive/30 max-w-md"
            />
          </Field>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={
                  confirmKey.trim().toUpperCase() !== project.key.toUpperCase() ||
                  deleting
                }
                className="gap-1.5"
              >
                <Trash2 data-icon="inline-start" />
                {deleting
                  ? "Đang xóa dự án…"
                  : `Xóa vĩnh viễn dự án ${project.key}`}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xác nhận xóa dự án {project.key}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Hành động này sẽ xóa vĩnh viễn toàn bộ dữ liệu của dự án {project.name} ({project.key}) bao gồm công việc, tài liệu và các automation rule. Bạn có chắc chắn không?
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
