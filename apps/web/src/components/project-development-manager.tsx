"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  GitPullRequest,
  GitCommit,
  Clock,
  Plus,
  Trash2,
  Copy,
  Check,
  FileCode2,
  ExternalLink,
  LoaderCircle,
  CheckCircle2,
  XCircle,
  Minus,
  RefreshCw,
  Terminal,
  Database,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api/api-request";
import { formatDistanceToNow, formatDistance } from "date-fns";

interface PullRequest {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
  draft: boolean;
  headBranch: string;
  baseBranch: string;
  headSha: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  assigneeLogin: string | null;
  assigneeAvatarUrl: string | null;
  commitsCount: number;
  changedFilesCount: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  checkState: "success" | "failure" | "pending" | null;
}

interface EnvVar {
  key: string;
  value: string;
}

export function ProjectDevelopmentManager({
  projectKey,
  initialPRs,
  initialEnvs,
  canUpdate = false,
  isOwner = false,
}: {
  projectKey: string;
  initialPRs: PullRequest[];
  initialEnvs: Record<string, string>;
  canUpdate?: boolean;
  isOwner?: boolean;
}) {
  const [prs, setPrs] = useState<PullRequest[]>(initialPRs);
  const [loadingPRs, setLoadingPRs] = useState(false);
  const [envs, setEnvs] = useState<EnvVar[]>(() =>
    Object.entries(initialEnvs).map(([key, value]) => ({ key, value })),
  );
  const [bulkText, setBulkText] = useState("");
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingEnvs, setSavingEnvs] = useState(false);

  // Refresh Pull Requests
  async function refreshPRs() {
    setLoadingPRs(true);
    try {
      const response = await fetch(
        `/api/projects/${projectKey}/development/pull-requests?force=true`,
      );
      if (!response.ok) throw new Error("Failed to load Pull Requests");
      const payload = await response.json();
      if (payload.ok && Array.isArray(payload.data)) {
        setPrs(payload.data);
        toast.success("Đã cập nhật danh sách Pull Request mới nhất");
      }
    } catch (err) {
      toast.error("Không thể cập nhật danh sách Pull Request");
    } finally {
      setLoadingPRs(false);
    }
  }

  // Environment variables modifications
  function addEnvRow() {
    setEnvs((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeEnvRow(index: number) {
    setEnvs((prev) => prev.filter((_, i) => i !== index));
  }

  function updateEnvRow(index: number, field: "key" | "value", val: string) {
    setEnvs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item)),
    );
  }

  // Parse bulk pasted .env
  function handleBulkImport() {
    const lines = bulkText.split("\n");
    const newEnvs: EnvVar[] = [];
    let hasError = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let trimmed = line.trim();

      // Skip empty lines or lines starting with comment marker
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Handle inline comments (strip everything after '#' if it's not inside quotest)
      const hashIndex = trimmed.indexOf("#");
      if (hashIndex !== -1) {
        const beforeHash = trimmed.substring(0, hashIndex).trim();
        const singleQuotesCount = (beforeHash.match(/'/g) || []).length;
        const doubleQuotesCount = (beforeHash.match(/"/g) || []).length;
        // Only strip if quotes around the value are balanced before the hash
        if (singleQuotesCount % 2 === 0 && doubleQuotesCount % 2 === 0) {
          trimmed = beforeHash;
        }
      }

      if (!trimmed) continue;

      const equalIndex = trimmed.indexOf("=");
      if (equalIndex <= 0) {
        hasError = true;
        break;
      }

      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();

      // Validate key has no space and is not empty
      if (/\s/.test(key) || !key) {
        hasError = true;
        break;
      }

      // Strip surrounding quotes from value
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }

      newEnvs.push({ key, value });
    }

    if (hasError) {
      toast.error("Format import không hợp lệ. Vui lòng kiểm tra lại");
      return;
    }

    setEnvs(newEnvs);
    setIsBulkMode(false);
    setBulkText("");
    toast.success(`Đã import thành công ${newEnvs.length} biến môi trường.`);
  }

  // Copy to clipboard
  function copyToClipboard() {
    const text = envs
      .filter((item) => item.key.trim() !== "")
      .map((item) => `${item.key}=${item.value}`)
      .join("\n");

    void navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Đã copy toàn bộ env vào clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  // Save to DB
  async function saveEnvs() {
    setSavingEnvs(true);
    try {
      // Build body map
      const body: Record<string, string> = {};
      for (const item of envs) {
        const k = item.key.trim();
        if (k) {
          body[k] = item.value;
        }
      }

      await apiRequest(`/api/projects/${projectKey}/env`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast.success("Lưu cấu hình môi trường thành công");
    } catch (err) {
      toast.error("Gặp lỗi khi lưu biến môi trường");
    } finally {
      setSavingEnvs(false);
    }
  }

  // Helper to calculate PR duration
  function getPRDuration(pr: PullRequest) {
    const start = new Date(pr.createdAt);
    const end = pr.closedAt ? new Date(pr.closedAt) : new Date();
    try {
      return formatDistance(start, end);
    } catch {
      return "N/A";
    }
  }

  // Render check state icon
  function renderCheckState(state: PullRequest["checkState"]) {
    switch (state) {
      case "success":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
          >
            <CheckCircle2 className="size-3.5" /> Checked
          </Badge>
        );
      case "failure":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-rose-200 bg-rose-50/50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
          >
            <XCircle className="size-3.5" /> Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="outline"
            className="gap-1 border-amber-200 bg-amber-50/50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
          >
            <LoaderCircle className="size-3.5 animate-spin" /> Pending
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="gap-1 border-slate-200 bg-slate-50/50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400"
          >
            <Minus className="size-3.5" /> No Checks
          </Badge>
        );
    }
  }

  // Render PR state badge
  function renderPRState(state: PullRequest["state"], draft: boolean) {
    if (draft) {
      return (
        <Badge className="bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-100">
          Draft
        </Badge>
      );
    }
    switch (state) {
      case "merged":
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400">
            Merged
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400">
            Closed
          </Badge>
        );
      case "open":
      default:
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400">
            Open
          </Badge>
        );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12 items-start">
      {/* LEFT COLUMN: Pull Requests */}
      <Card className="lg:col-span-7">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <GitPullRequest className="size-5 text-blue-500" />
              Pull Requests
            </CardTitle>
            <CardDescription>
              Các pull requests đang hoạt động và đã hoàn thành trên repository
            </CardDescription>
          </div>
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshPRs}
              disabled={loadingPRs}
            >
              <RefreshCw
                className={cn("size-4 mr-1", loadingPRs && "animate-spin")}
              />
              Cập nhật
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-4 px-2 sm:px-6">
          {prs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-3">
              <GitPullRequest className="size-8 opacity-40 text-muted-foreground" />
              Không tìm thấy Pull Request nào hoặc dự án chưa liên kết
              Repository.
            </div>
          ) : (
            <div className="space-y-4">
              {prs.map((pr) => (
                <div
                  key={pr.number}
                  className="rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:bg-accent/25 hover:shadow-xs flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-foreground text-sm sm:text-base hover:underline hover:text-primary leading-tight flex items-start gap-1"
                      >
                        <span className="text-muted-foreground font-normal shrink-0">
                          #{pr.number}
                        </span>
                        <span>·</span>
                        <span>{pr.title}</span>
                      </a>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground font-mono">
                        <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px]">
                          {pr.headBranch}
                        </span>
                        <span>→</span>
                        <span className="bg-secondary px-1.5 py-0.5 rounded text-[10px]">
                          {pr.baseBranch}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {renderPRState(pr.state, pr.draft)}
                      {renderCheckState(pr.checkState)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3.5">
                      <span
                        className="flex items-center gap-1"
                        title="Số lượng commits"
                      >
                        <GitCommit className="size-3.5 text-slate-400" />
                        <strong>{pr.commitsCount}</strong> commits
                      </span>
                      <span
                        className="flex items-center gap-1"
                        title="Số lượng files thay đổi"
                      >
                        <FileCode2 className="size-3.5 text-slate-400" />
                        <strong>{pr.changedFilesCount}</strong> files
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5 text-slate-400" />
                        Hoạt động: <strong>{getPRDuration(pr)}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {pr.authorAvatarUrl ? (
                        <img
                          src={pr.authorAvatarUrl}
                          alt={pr.authorLogin || ""}
                          className="size-5 rounded-full ring-1 ring-border shadow-xs"
                          title={`Tác giả: @${pr.authorLogin}`}
                        />
                      ) : null}
                      {pr.assigneeLogin ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">
                            Assignee:
                          </span>
                          <img
                            src={pr.assigneeAvatarUrl || ""}
                            alt={pr.assigneeLogin}
                            className="size-5 rounded-full ring-1 ring-border shadow-xs"
                            title={`Assignee: @${pr.assigneeLogin}`}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RIGHT COLUMN: Env Variables */}
      <Card className="lg:col-span-5">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Database className="size-5 text-emerald-500" />
              Environment Variables
            </CardTitle>
            <div className="flex gap-2">
              {canUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkMode(!isBulkMode)}
                >
                  {isBulkMode ? "Quay lại" : "Bulk Import"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                disabled={envs.length === 0}
              >
                {copied ? (
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
          {isBulkMode ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-50/50 border border-amber-200/80 p-3 text-xs text-amber-800 flex items-start gap-2 leading-relaxed">
                <Lock className="size-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Lưu ý:</strong> Paste trực tiếp định dạng file{" "}
                  <code>.env</code> vào khung dưới (VD: <code>KEY=VALUE</code>).
                  Việc import này sẽ **ghi đè và tự động xóa các biến hiện tại**
                  không có trong nội dung paste.
                </span>
              </div>
              <Textarea
                placeholder="PORT=4000&#10;MONGODB_URI=mongodb://...&#10;API_KEY=your_key"
                rows={12}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                disabled={!canUpdate}
                className="font-mono text-xs bg-background/50 border-border/80 rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkMode(false)}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkImport}
                  disabled={!canUpdate}
                >
                  Import
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 max-h-105 overflow-y-auto pr-1">
                {envs.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    {canUpdate
                      ? "Chưa cấu hình biến môi trường nào. Bấm nút Thêm hoặc Bulk Import."
                      : "Chưa cấu hình biến môi trường nào."}
                  </div>
                ) : (
                  envs.map((env, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      {canUpdate ? (
                        <>
                          <Input
                            placeholder="KEY"
                            value={env.key}
                            onChange={(e) =>
                              updateEnvRow(index, "key", e.target.value)
                            }
                            className="font-mono text-xs h-9 flex-1"
                          />
                          <Input
                            placeholder="VALUE"
                            value={env.value}
                            onChange={(e) =>
                              updateEnvRow(index, "value", e.target.value)
                            }
                            className="font-mono text-xs h-9 flex-1"
                            type="text"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEnvRow(index)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50/50 shrink-0 size-9"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Input
                            value={env.key}
                            readOnly
                            onClick={() => {
                              void navigator.clipboard.writeText(env.key);
                              toast.success(`Đã sao chép Key: ${env.key}`);
                            }}
                            className="font-mono text-xs h-9 flex-1 cursor-pointer hover:bg-muted/80 transition-colors"
                          />
                          <Input
                            value={env.value}
                            readOnly
                            onClick={() => {
                              void navigator.clipboard.writeText(env.value);
                              toast.success(`Đã sao chép Value: ${env.value}`);
                            }}
                            className="font-mono text-xs h-9 flex-1 cursor-pointer hover:bg-muted/80 transition-colors"
                          />
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {canUpdate && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addEnvRow}
                    className="gap-1"
                  >
                    <Plus className="size-4" /> Thêm biến
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveEnvs}
                    disabled={savingEnvs || !canUpdate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {savingEnvs ? (
                      <LoaderCircle className="size-4 animate-spin mr-1" />
                    ) : null}
                    Lưu cấu hình
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
