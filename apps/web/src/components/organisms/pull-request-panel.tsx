"use client";

import { formatDistance } from "date-fns";
import {
  CheckCircle2,
  Clock,
  FileCode2,
  GitCommit,
  GitPullRequest,
  LoaderCircle,
  Minus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useProjectPullRequests } from "@/features/development/hooks/use-project-pull-requests";
import type { DevelopmentPullRequest } from "@/features/development/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function pullRequestDuration(pullRequest: DevelopmentPullRequest): string {
  try {
    return formatDistance(
      new Date(pullRequest.createdAt),
      pullRequest.closedAt ? new Date(pullRequest.closedAt) : new Date(),
    );
  } catch {
    return "N/A";
  }
}

function PullRequestCheckBadge({
  state,
}: {
  state: DevelopmentPullRequest["checkState"];
}) {
  if (state === "success") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400"
      >
        <CheckCircle2 className="size-3.5" /> Checked
      </Badge>
    );
  }
  if (state === "failure") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-rose-200 bg-rose-50/50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400"
      >
        <XCircle className="size-3.5" /> Failed
      </Badge>
    );
  }
  if (state === "pending") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-200 bg-amber-50/50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400"
      >
        <LoaderCircle className="size-3.5 animate-spin" /> Pending
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-slate-200 bg-slate-50/50 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400"
    >
      <Minus className="size-3.5" /> No Checks
    </Badge>
  );
}

function PullRequestStateBadge({
  state,
  draft,
}: Pick<DevelopmentPullRequest, "state" | "draft">) {
  if (draft) {
    return (
      <Badge className="border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-100">
        Draft
      </Badge>
    );
  }
  if (state === "merged") {
    return (
      <Badge className="border-purple-200 bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-400">
        Merged
      </Badge>
    );
  }
  if (state === "closed") {
    return (
      <Badge className="border-rose-200 bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400">
        Closed
      </Badge>
    );
  }
  return (
    <Badge className="border-emerald-200 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400">
      Open
    </Badge>
  );
}

export function PullRequestPanel({
  projectKey,
  initialPullRequests,
  canRefresh,
}: {
  projectKey: string;
  initialPullRequests: DevelopmentPullRequest[];
  canRefresh: boolean;
}) {
  const { loading, pullRequests, refresh } = useProjectPullRequests(
    projectKey,
    initialPullRequests,
  );

  return (
    <Card className="lg:col-span-7">
      <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-bold">
            <GitPullRequest className="size-5 text-blue-500" />
            Pull Requests
          </CardTitle>
          <CardDescription>
            Các pull requests đang hoạt động và đã hoàn thành trên repository
          </CardDescription>
        </div>
        {canRefresh ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw
              className={cn("mr-1 size-4", loading && "animate-spin")}
            />
            Cập nhật
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6">
        {pullRequests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <GitPullRequest className="size-8 text-muted-foreground opacity-40" />
            Không tìm thấy Pull Request nào hoặc dự án chưa liên kết Repository.
          </div>
        ) : (
          <div className="space-y-4">
            {pullRequests.map((pullRequest) => (
              <div
                key={pullRequest.number}
                className="flex flex-col gap-3 rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:bg-accent/25 hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <a
                      href={pullRequest.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-1 text-sm font-bold leading-tight text-foreground hover:text-primary hover:underline sm:text-base"
                    >
                      <span className="shrink-0 font-normal text-muted-foreground">
                        #{pullRequest.number}
                      </span>
                      <span>·</span>
                      <span>{pullRequest.title}</span>
                    </a>
                    <div className="mt-1.5 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                        {pullRequest.headBranch}
                      </span>
                      <span>→</span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                        {pullRequest.baseBranch}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <PullRequestStateBadge
                      state={pullRequest.state}
                      draft={pullRequest.draft}
                    />
                    <PullRequestCheckBadge state={pullRequest.checkState} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3.5">
                    <span className="flex items-center gap-1" title="Số lượng commits">
                      <GitCommit className="size-3.5 text-slate-400" />
                      <strong>{pullRequest.commitsCount}</strong> commits
                    </span>
                    <span
                      className="flex items-center gap-1"
                      title="Số lượng files thay đổi"
                    >
                      <FileCode2 className="size-3.5 text-slate-400" />
                      <strong>{pullRequest.changedFilesCount}</strong> files
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5 text-slate-400" />
                      Hoạt động: <strong>{pullRequestDuration(pullRequest)}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {pullRequest.authorAvatarUrl ? (
                      <img
                        src={pullRequest.authorAvatarUrl}
                        alt={pullRequest.authorLogin || ""}
                        className="size-5 rounded-full shadow-xs ring-1 ring-border"
                        title={`Tác giả: @${pullRequest.authorLogin}`}
                      />
                    ) : null}
                    {pullRequest.assigneeLogin ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Assignee:</span>
                        <img
                          src={pullRequest.assigneeAvatarUrl || ""}
                          alt={pullRequest.assigneeLogin}
                          className="size-5 rounded-full shadow-xs ring-1 ring-border"
                          title={`Assignee: @${pullRequest.assigneeLogin}`}
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
  );
}
