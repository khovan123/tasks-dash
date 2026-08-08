"use client";

import type { VariantProps } from "class-variance-authority";
import { GitBranch, GitCommit, GitPullRequest } from "lucide-react";
import {
  GITHUB_PR_STATUSES,
  type GithubPullRequestStatus,
} from "@tasks-dash/contracts";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GithubCommitView {
  sha: string;
  message: string;
  url?: string;
  branch?: string;
  committedAt?: string;
  sources?: string[];
}

export interface GithubPullRequestView {
  number: number;
  title: string;
  url: string;
  state: string;
  status: GithubPullRequestStatus;
  draft: boolean;
  headBranch: string;
  baseBranch: string;
  headSha: string;
  action: string;
  reviewState?: string;
  authorLogin?: string;
  updatedAt?: string;
  closedAt?: string;
  mergedAt?: string;
  sources?: string[];
}

export interface GithubWorkItemView {
  branches?: string[];
  commits?: GithubCommitView[];
  pullRequests?: GithubPullRequestView[];
  branch?: string;
  commitShas?: string[];
  pullRequestNumber?: number;
  pullRequestUrl?: string;
  pullRequestState?: string;
}

const STATUS_LABELS: Record<GithubPullRequestStatus, string> = {
  [GITHUB_PR_STATUSES.draft]: "Draft",
  [GITHUB_PR_STATUSES.open]: "Open",
  [GITHUB_PR_STATUSES.reviewRequested]: "Chờ review",
  [GITHUB_PR_STATUSES.approved]: "Approved",
  [GITHUB_PR_STATUSES.changesRequested]: "Changes requested",
  [GITHUB_PR_STATUSES.reviewCommented]: "Đã review",
  [GITHUB_PR_STATUSES.merged]: "Merged",
  [GITHUB_PR_STATUSES.closed]: "Closed",
};

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

function statusVariant(status: GithubPullRequestStatus): BadgeVariant {
  if (status === GITHUB_PR_STATUSES.approved) return "success";
  if (status === GITHUB_PR_STATUSES.merged) return "purple";
  if (status === GITHUB_PR_STATUSES.closed) return "destructive";
  if (status === GITHUB_PR_STATUSES.changesRequested) return "destructive";
  if (status === GITHUB_PR_STATUSES.reviewRequested) return "warning";
  if (status === GITHUB_PR_STATUSES.reviewCommented) return "info";
  if (status === GITHUB_PR_STATUSES.open) return "success";
  return "secondary";
}

function legacyPullRequests(
  github: GithubWorkItemView,
): GithubPullRequestView[] {
  if (!github.pullRequestNumber || !github.pullRequestUrl) return [];
  const state = github.pullRequestState ?? GITHUB_PR_STATUSES.open;
  const status =
    state === GITHUB_PR_STATUSES.merged
      ? GITHUB_PR_STATUSES.merged
      : state === GITHUB_PR_STATUSES.closed
        ? GITHUB_PR_STATUSES.closed
        : GITHUB_PR_STATUSES.open;
  return [
    {
      number: github.pullRequestNumber,
      title: `Pull request #${github.pullRequestNumber}`,
      url: github.pullRequestUrl,
      state,
      status,
      draft: false,
      headBranch: github.branch ?? "",
      baseBranch: "",
      headSha: "",
      action: "legacy",
    },
  ];
}

function commitLabel(commit: GithubCommitView): string {
  return `${commit.sha.slice(0, 7)}${
    commit.message ? ` · ${commit.message.split("\n")[0]}` : ""
  }`;
}

export function GithubWorkItemLinks({
  github,
  compact = false,
}: {
  github?: GithubWorkItemView;
  compact?: boolean;
}) {
  if (!github) return <span className="text-muted-foreground">—</span>;
  const pullRequests = github.pullRequests?.length
    ? github.pullRequests
    : legacyPullRequests(github);
  const branches = [
    ...new Set([
      ...(github.branches ?? []),
      ...(github.branch ? [github.branch] : []),
    ]),
  ];
  const commits: GithubCommitView[] = github.commits?.length
    ? github.commits
    : (github.commitShas ?? []).map((sha) => ({ sha, message: "" }));

  if (!pullRequests.length && !branches.length && !commits.length) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full flex-wrap items-center gap-2 text-left",
            compact ? "mt-2" : "min-w-72",
          )}
        >
          {pullRequests.length ? (
            pullRequests.map((pullRequest) => (
              <Badge
                key={pullRequest.number}
                variant={statusVariant(pullRequest.status)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                  compact ? "text-[11px]" : "text-xs",
                )}
                title={pullRequest.title}
              >
                <GitPullRequest className="size-3.5" />
                <span>#{pullRequest.number}</span>
              </Badge>
            ))
          ) : (
            <Badge
              variant="outline"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium",
                compact ? "text-[11px]" : "text-xs",
              )}
            >
              <GitBranch className="size-3.5" />
              <span>GitHub details</span>
            </Badge>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 pt-6 pb-4">
          <DialogTitle>GitHub activity</DialogTitle>
          <DialogDescription>
            Pull request, branch và commit liên quan đến work item này.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-6">
          <div className="grid gap-3">
          {pullRequests.map((pullRequest) => (
            <div
              className="grid gap-3 rounded-xl border border-border/70 bg-card/70 p-3 shadow-sm"
              key={pullRequest.number}
            >
              {pullRequest.headBranch ? (
                <div className="rounded-lg bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground">
                  <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
                    <GitBranch className="size-3.5" />
                    Branch
                  </div>
                  <div className="break-all">
                    {pullRequest.headBranch}
                    {pullRequest.baseBranch ? ` → ${pullRequest.baseBranch}` : ""}
                  </div>
                </div>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <a
                  className="min-w-0 text-sm font-semibold leading-5 text-primary hover:underline"
                  href={pullRequest.url}
                  target="_blank"
                  rel="noreferrer"
                  title={(pullRequest.sources ?? []).join(", ")}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <GitPullRequest className="size-3.5 shrink-0" />
                    <span className="truncate">#{pullRequest.number}</span>
                  </span>
                  <span className="mt-1 block text-balance text-foreground">
                    {pullRequest.title}
                  </span>
                </a>
                <Badge
                  className="shrink-0"
                  variant={statusVariant(pullRequest.status)}
                  title={`GitHub action: ${pullRequest.action}`}
                >
                  {STATUS_LABELS[pullRequest.status] ?? pullRequest.status}
                </Badge>
              </div>

              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                {commits.length ? (
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                    <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
                      <GitCommit className="size-3.5" />
                      Commit gần nhất
                    </div>
                    {(() => {
                      const matchedCommit =
                        commits.find((commit) => commit.sha === pullRequest.headSha) ??
                        commits.find((commit) => commit.branch === pullRequest.headBranch) ??
                        commits[0];
                      if (!matchedCommit) return <span>—</span>;
                      return matchedCommit.url ? (
                        <a
                          className="block break-all text-foreground hover:text-primary hover:underline"
                          href={matchedCommit.url}
                          target="_blank"
                          rel="noreferrer"
                          title={(matchedCommit.sources ?? []).join(", ")}
                        >
                          {commitLabel(matchedCommit)}
                        </a>
                      ) : (
                        <span className="block break-all text-foreground">
                          {commitLabel(matchedCommit)}
                        </span>
                      );
                    })()}
                  </div>
                ) : null}
              </div>

              {pullRequest.authorLogin ? (
                <div className="text-xs text-muted-foreground">
                  @{pullRequest.authorLogin}
                </div>
              ) : null}
            </div>
          ))}

          {branches.length ? (
            <div className="grid gap-1 rounded-xl border border-dashed border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
              <strong className="inline-flex items-center gap-1 text-foreground">
                <GitBranch className="size-3.5" /> Branch
              </strong>
              <span className="break-all">{branches.join(", ")}</span>
            </div>
          ) : null}

          {commits.length ? (
            <div className="mb-2 grid gap-2 rounded-xl border border-dashed border-border/70 bg-background/60 p-3 text-xs text-muted-foreground">
              <strong className="inline-flex items-center gap-1 text-foreground">
                <GitCommit className="size-3.5" /> Commit gần nhất
              </strong>
              {commits.slice(0, 3).map((commit) => {
                return commit.url ? (
                  <a
                    className="break-all rounded-lg bg-muted/50 px-2.5 py-2 hover:text-primary hover:underline"
                    href={commit.url}
                    key={commit.sha}
                    target="_blank"
                    rel="noreferrer"
                    title={(commit.sources ?? []).join(", ")}
                  >
                    {commitLabel(commit)}
                  </a>
                ) : (
                  <span
                    className="break-all rounded-lg bg-muted/50 px-2.5 py-2"
                    key={commit.sha}
                  >
                    {commitLabel(commit)}
                  </span>
                );
              })}
            </div>
          ) : null}
          </div>
        </div>
        <DialogFooter className="border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {pullRequests.length} PR · {branches.length} branch · {commits.length} commit
            </span>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                Đóng
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
