"use client";

import { Check, Copy, Database, LoaderCircle, Lock, Plus, Trash2 } from "lucide-react";
import { useProjectEnvironment } from "@/features/development/hooks/use-project-environment";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EnvironmentEditor({
  projectKey,
  initialValues,
  canUpdate,
}: {
  projectKey: string;
  initialValues: Record<string, string>;
  canUpdate: boolean;
}) {
  const environment = useProjectEnvironment(projectKey, initialValues);

  return (
    <Card className="lg:col-span-5">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <Database className="size-5 text-emerald-500" />
            Environment Variables
          </CardTitle>
          <div className="flex gap-2">
            {canUpdate ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => environment.setBulkMode(!environment.bulkMode)}
              >
                {environment.bulkMode ? "Quay lại" : "Bulk Import"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void environment.copyAll()}
              disabled={environment.rows.length === 0}
            >
              {environment.copied ? (
                <Check className="size-4 text-emerald-500" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          {canUpdate
            ? "Xem và cập nhật cấu hình biến môi trường của dự án"
            : "Xem cấu hình biến môi trường của dự án (Bạn không có quyền chỉnh sửa)"}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        {environment.bulkMode ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-xs leading-relaxed text-amber-800">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>Lưu ý:</strong> Paste trực tiếp định dạng file{" "}
                <code>.env</code> vào khung dưới. Import sẽ ghi đè danh sách biến
                hiện tại bằng nội dung đã parse.
              </span>
            </div>
            <Textarea
              placeholder="PORT=4000&#10;MONGODB_URI=mongodb://...&#10;API_KEY=your_key"
              rows={12}
              value={environment.bulkText}
              onChange={(event) => environment.setBulkText(event.target.value)}
              disabled={!canUpdate}
              className="rounded-xl border-border/80 bg-background/50 font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => environment.setBulkMode(false)}
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={environment.importBulk}
                disabled={!canUpdate}
              >
                Import
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-105 space-y-2 overflow-y-auto pr-1">
              {environment.rows.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {canUpdate
                    ? "Chưa cấu hình biến môi trường nào. Bấm nút Thêm hoặc Bulk Import."
                    : "Chưa cấu hình biến môi trường nào."}
                </div>
              ) : (
                environment.rows.map((row, index) => (
                  <div key={`${index}-${row.key}`} className="flex items-center gap-2">
                    {canUpdate ? (
                      <>
                        <Input
                          placeholder="KEY"
                          value={row.key}
                          onChange={(event) =>
                            environment.updateRow(index, "key", event.target.value)
                          }
                          className="h-9 flex-1 font-mono text-xs"
                        />
                        <Input
                          placeholder="VALUE"
                          value={row.value}
                          onChange={(event) =>
                            environment.updateRow(index, "value", event.target.value)
                          }
                          className="h-9 flex-1 font-mono text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => environment.removeRow(index)}
                          className="size-9 shrink-0 text-rose-500 hover:bg-rose-50/50 hover:text-rose-600"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input
                          value={row.key}
                          readOnly
                          onClick={() => void environment.copyValue("Key", row.key)}
                          className="h-9 flex-1 cursor-pointer font-mono text-xs transition-colors hover:bg-muted/80"
                        />
                        <Input
                          value={row.value}
                          readOnly
                          onClick={() =>
                            void environment.copyValue("Value", row.value)
                          }
                          className="h-9 flex-1 cursor-pointer font-mono text-xs transition-colors hover:bg-muted/80"
                        />
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            {canUpdate ? (
              <div className="flex items-center justify-between border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={environment.addRow}
                  className="gap-1"
                >
                  <Plus className="size-4" /> Thêm biến
                </Button>
                <Button
                  size="sm"
                  onClick={() => void environment.save()}
                  disabled={environment.saving}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {environment.saving ? (
                    <LoaderCircle className="mr-1 size-4 animate-spin" />
                  ) : null}
                  Lưu cấu hình
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
