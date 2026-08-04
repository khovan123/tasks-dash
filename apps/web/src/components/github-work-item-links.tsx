import {
  GITHUB_PR_STATUSES,
  type GithubPullRequestStatus,
} from "@tasks-dash/contracts";

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

function statusClass(status: string): string {
  return status.toLowerCase().replaceAll("_", "-");
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
  if (!github) return <span>—</span>;
  const pullRequests = github.pullRequests?.length
    ? github.pullRequests
    : legacyPullRequests(github);
  const branches = [
    ...new Set([
      ...(github.branches ?? []),
      ...(github.branch ? [github.branch] : []),
    ]),
  ];
  const commits = github.commits?.length
    ? github.commits
    : (github.commitShas ?? []).map((sha) => ({ sha, message: "" }));

  if (!pullRequests.length && !branches.length && !commits.length) {
    return <span>—</span>;
  }

  return (
    <div className={compact ? "github-links compact" : "github-links"}>
      {pullRequests.map((pullRequest) => (
        <div className="github-pr" key={pullRequest.number}>
          <div className="github-pr-head">
            <a
              href={pullRequest.url}
              target="_blank"
              rel="noreferrer"
              title={(pullRequest.sources ?? []).join(", ")}
            >
              #{pullRequest.number} · {pullRequest.title}
            </a>
            <span
              className={`pr-status ${statusClass(pullRequest.status)}`}
              title={`GitHub action: ${pullRequest.action}`}
            >
              {STATUS_LABELS[pullRequest.status] ?? pullRequest.status}
            </span>
          </div>
          {!compact && pullRequest.headBranch ? (
            <small>
              {pullRequest.headBranch}
              {pullRequest.baseBranch
                ? ` → ${pullRequest.baseBranch}`
                : ""}
              {pullRequest.authorLogin
                ? ` · @${pullRequest.authorLogin}`
                : ""}
            </small>
          ) : null}
        </div>
      ))}

      {!compact && branches.length ? (
        <div className="github-meta-row">
          <strong>Branch</strong>
          <span>{branches.join(", ")}</span>
        </div>
      ) : null}

      {!compact && commits.length ? (
        <div className="github-commits">
          <strong>Commit gần nhất</strong>
          {commits.slice(0, 3).map((commit) => {
            const label = `${commit.sha.slice(0, 7)}${
              commit.message ? ` · ${commit.message.split("\n")[0]}` : ""
            }`;
            return commit.url ? (
              <a
                href={commit.url}
                key={commit.sha}
                target="_blank"
                rel="noreferrer"
                title={(commit.sources ?? []).join(", ")}
              >
                {label}
              </a>
            ) : (
              <span key={commit.sha}>{label}</span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
