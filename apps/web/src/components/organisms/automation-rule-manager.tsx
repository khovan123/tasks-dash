"use client";

import { useState } from "react";
import { AlertTriangle, Clock, Play, Power, Trash2 } from "lucide-react";
import {
  automationChannelLabel,
  automationModeLabel,
  automationTriggerLabel,
} from "@/features/automations/config";
import type { AutomationRule } from "@/features/automations/types";
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
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export function AutomationRuleManager({
  projectKey,
  initialRules,
  canManage = false,
}: {
  projectKey: string;
  initialRules: AutomationRule[];
  canManage?: boolean;
}) {
  const [rules, setRules] = useState<AutomationRule[]>(initialRules);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  async function toggleRule(rule: AutomationRule) {
    setTogglingId(rule._id);
    const nextEnabled = !rule.enabled;
    try {
      await apiRequest(`/api/projects/${projectKey}/automations/${rule._id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      setRules((prev) =>
        prev.map((item) =>
          item._id === rule._id ? { ...item, enabled: nextEnabled } : item,
        ),
      );
    } catch {
      // Keep current state when the server rejects the toggle.
    } finally {
      setTogglingId(null);
    }
  }

  async function runRule(rule: AutomationRule) {
    setRunningId(rule._id);
    try {
      const updated = await apiRequest<AutomationRule>(
        `/api/projects/${projectKey}/automations/${rule._id}/run`,
        { method: "POST" },
      );
      if (updated) {
        setRules((prev) =>
          prev.map((item) => (item._id === rule._id ? updated : item)),
        );
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Chạy thất bại";
      setRules((prev) =>
        prev.map((item) =>
          item._id === rule._id
            ? { ...item, lastResult: "FAILED", lastError: message }
            : item,
        ),
      );
    } finally {
      setRunningId(null);
    }
  }

  async function deleteRule(ruleId: string) {
    try {
      await apiRequest(`/api/projects/${projectKey}/automations/${ruleId}`, {
        method: "DELETE",
      });
      setRules((prev) => prev.filter((item) => item._id !== ruleId));
    } catch {
      // Keep the rule visible when delete fails.
    }
  }

  if (rules.length === 0) {
    return (
      <Empty className="min-h-48">
        <EmptyHeader>
          <EmptyTitle>Chưa có automation rule</EmptyTitle>
          <EmptyDescription>
            Tạo automation rule đầu tiên ở form bên dưới.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-3">
      {rules.map((rule) => {
        const isToggling = togglingId === rule._id;
        const isRunning = runningId === rule._id;
        const isSystemRule = Boolean(rule.isSystem);
        const channelType = rule.actions?.[0]?.config?.channelType;

        return (
          <article
            key={rule._id}
            className={`grid gap-4 rounded-lg border p-4 transition sm:grid-cols-[1fr_auto] ${
              rule.enabled
                ? "border-border bg-muted/20"
                : "border-dashed border-border/60 bg-muted/5 opacity-75"
            }`}
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="font-semibold text-foreground">
                  {rule.name}
                </strong>
                <Badge variant={rule.enabled ? "success" : "secondary"}>
                  {rule.enabled ? "Đã bật" : "Tắt"}
                </Badge>
                {isSystemRule ? <Badge variant="outline">Hệ thống</Badge> : null}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  Kích hoạt:{" "}
                  <strong className="font-medium text-foreground">
                    {automationTriggerLabel(rule.trigger)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Chế độ:{" "}
                  <strong className="font-medium text-foreground">
                    {automationModeLabel(rule.executionMode)}
                  </strong>
                </span>
                {rule.cronExpression ? (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-muted-foreground" />
                      Lịch:
                      <Badge variant="outline" className="font-mono">
                        {rule.cronExpression}
                      </Badge>
                    </span>
                  </>
                ) : null}
                {channelType ? (
                  <>
                    <span>•</span>
                    <span>
                      Kênh:{" "}
                      <span className="font-medium text-foreground">
                        {automationChannelLabel(channelType)}
                      </span>
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              <div className="text-right text-sm">
                <span className="font-semibold text-foreground">
                  {rule.lastResult ?? "Chưa chạy"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {rule.runCount} lần chạy
                </p>
              </div>

              {canManage ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={rule.enabled ? "default" : "outline"}
                    size="sm"
                    disabled={isToggling || isSystemRule}
                    onClick={() => void toggleRule(rule)}
                    className="gap-1.5 text-xs"
                    title={
                      isSystemRule
                        ? "Rule hệ thống không thể bật/tắt."
                        : undefined
                    }
                  >
                    <Power data-icon="inline-start" />
                    {rule.enabled ? "Tắt" : "Bật"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isRunning}
                    onClick={() => void runRule(rule)}
                    title="Chạy thử rule ngay"
                    className="gap-1 text-xs"
                  >
                    <Play data-icon="inline-start" />
                    {isRunning ? "Đang chạy…" : "Chạy thử"}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Xóa rule"
                        disabled={isSystemRule}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                      <AlertDialogHeader>
                        <AlertDialogMedia>
                          <AlertTriangle className="text-destructive" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>Xóa rule {rule.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {isSystemRule
                            ? "Rule hệ thống được tạo sẵn cho GitHub/Discord automation và không thể xóa."
                            : `Automation này sẽ bị xóa vĩnh viễn khỏi dự án ${projectKey}.`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Hủy</AlertDialogCancel>
                        {!isSystemRule ? (
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => void deleteRule(rule._id)}
                          >
                            Xóa rule
                          </AlertDialogAction>
                        ) : null}
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ) : null}
            </div>

            {rule.lastError ? (
              <Alert variant="destructive" className="mt-1 sm:col-span-2">
                <AlertTitle>Lần chạy gần nhất thất bại</AlertTitle>
                <AlertDescription>{rule.lastError}</AlertDescription>
              </Alert>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
