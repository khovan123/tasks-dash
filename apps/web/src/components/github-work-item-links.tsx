import type { VariantProps } from "class-variance-authority";
import { GitBranch, GitCommit, GitPullRequest } from "lucide-react";
import {
  GITHUB_PR_STATUSES,
  type GithubPullRequestStatus,
} from "@tasks-dash/contracts";
import { Badge, badgeVariants } from "@/components/ui/badge";
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
    <div className={cn("grid gap-2", compact ? "mt-2" : "min-w-64")}>
      {pullRequests.map((pullRequest) => (
        <div className="grid gap-1" key={pullRequest.number}>
          <div className="flex flex-wrap items-center gap-2">
            <a
              className={cn(
                "inline-flex items-center gap-1 font-medium text-primary hover:underline",
                compact && "text-xs",
              )}
              href={pullRequest.url}
              target="_blank"
              rel="noreferrer"
              title={(pullRequest.sources ?? []).join(", ")}
            >
              <GitPullRequest className="size-3.5" />
              #{pullRequest.number} · {pullRequest.title}
            </a>
            <Badge
              variant={statusVariant(pullRequest.status)}
              title={`GitHub action: ${pullRequest.action}`}
            >
              {STATUS_LABELS[pullRequest.status] ?? pullRequest.status}
            </Badge>
          </div>
          {!compact && pullRequest.headBranch ? (
            <p className="text-xs text-muted-foreground">
              {pullRequest.headBranch}
              {pullRequest.baseBranch ? ` → ${pullRequest.baseBranch}` : ""}
              {pullRequest.authorLogin ? ` · @${pullRequest.authorLogin}` : ""}
            </p>
          ) : null}
        </div>
      ))}

      {!compact && branches.length ? (
        <div className="grid gap-1 text-xs text-muted-foreground">
          <strong className="inline-flex items-center gap-1 text-foreground">
            <GitBranch className="size-3.5" /> Branch
          </strong>
          <span className="break-all">{branches.join(", ")}</span>
        </div>
      ) : null}

      {!compact && commits.length ? (
        <div className="grid gap-1 text-xs text-muted-foreground">
          <strong className="inline-flex items-center gap-1 text-foreground">
            <GitCommit className="size-3.5" /> Commit gần nhất
          </strong>
          {commits.slice(0, 3).map((commit) => {
            const label = `${commit.sha.slice(0, 7)}${
              commit.message ? ` · ${commit.message.split("\n")[0]}` : ""
            }`;
            return commit.url ? (
              <a
                className="break-all hover:text-primary hover:underline"
                href={commit.url}
                key={commit.sha}
                target="_blank"
                rel="noreferrer"
                title={(commit.sources ?? []).join(", ")}
              >
                {label}
              </a>
            ) : (
              <span className="break-all" key={commit.sha}>{label}</span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
