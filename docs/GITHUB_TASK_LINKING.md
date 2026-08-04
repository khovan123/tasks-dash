# GitHub task linking

Tasks Dash links GitHub activity to a Work Item only when all of these conditions are true:

1. The GitHub App installation is connected to the workspace.
2. The repository is mapped to a Tasks Dash project through `repositoryFullName`.
3. The detected key uses that exact project's key prefix.
4. The Work Item exists in the same workspace.

For a project with key `LCSP`, accepted examples include:

```text
LCSP-1
feature/LCSP-1-login
fix/lcsp-12-refresh-token
[LCSP-28] Handle expired session
```

Keys are detected case-insensitively and normalized to uppercase. A repository mapped to project `LCSP` will not link `ABC-1` even when that value appears in a PR or commit.

## Detection sources

### Pull request event

The `pull_request` webhook searches all of these values:

- PR title;
- PR body;
- source branch name.

A PR can link more than one Work Item. Each linked Work Item stores the source that caused the match.

### Push event

The `push` webhook searches:

- pushed branch name;
- every commit message in the push;
- the head commit message when it is not already in the commit list.

When a branch is named `feature/LCSP-1-login`, every commit pushed to that branch is linked to `LCSP-1`. A commit message can additionally link the same commit to other LCSP Work Items.

Examples:

```text
Branch: feature/LCSP-1-login
Commit: LCSP-2 add validation
```

The commit is linked to both `LCSP-1` and `LCSP-2` with different detection sources.

### Pull request review event

The `pull_request_review` webhook updates the detailed review status for every Work Item linked through the PR title, body, or branch.

## Stored GitHub data

Each Work Item can store:

- multiple branch names;
- up to 100 recent commits;
- up to 20 pull requests;
- the source used to detect each link;
- PR title, URL, author, source branch, target branch, head SHA, timestamps, lifecycle state, and review state.

Legacy single-PR fields remain readable so existing MongoDB records are not lost.

## PR status shown in Tasks Dash

The Work Item and Backlog UI display these statuses:

| Status | Meaning |
|---|---|
| `DRAFT` | PR is still a draft |
| `OPEN` | PR is open and ready for normal processing |
| `REVIEW_REQUESTED` | A reviewer was requested or a review was dismissed |
| `APPROVED` | An approval review was submitted |
| `CHANGES_REQUESTED` | A reviewer requested changes |
| `REVIEW_COMMENTED` | A review comment was submitted without approval or change request |
| `MERGED` | PR was merged |
| `CLOSED` | PR was closed without merge |

The UI also shows the PR number, title, source and target branches, author, linked branches, and up to three recent commit messages.

## Required GitHub App webhook subscriptions

Enable all of these webhook events in the GitHub App settings:

- Installation
- Installation repositories
- Pull request
- Pull request review
- Push

Minimum repository permissions remain:

- Metadata: Read-only
- Contents: Read-only
- Pull requests: Read-only

`Issues: Read and write` is required only when the automation action `CREATE_GITHUB_ISSUE` is enabled.

## Verification matrix

After deployment, verify these cases against a project mapped to the target repository:

1. Open a PR titled `LCSP-1 add login` from an unrelated branch and confirm `LCSP-1` is linked.
2. Open a PR from branch `feature/LCSP-2-login` with no key in title/body and confirm `LCSP-2` is linked.
3. Push commit `LCSP-3 validate token` from a branch without a key and confirm the commit is linked to `LCSP-3`.
4. Push any commit from branch `fix/LCSP-4-timeout` and confirm the branch and commit are linked to `LCSP-4`.
5. Mention `ABC-1` in the LCSP repository and confirm no LCSP task is linked.
6. Mark a linked PR as draft, ready for review, approved, changes requested, merged, and closed; confirm the status changes in the task.
7. Redeliver the same webhook and confirm no duplicate delivery processing or duplicate PR/commit record appears.
