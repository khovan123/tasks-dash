# GitHub task linking

Tasks Dash never assumes a fixed project key. The accepted key prefix is always read from the project already configured in MongoDB.

The webhook resolves links in this order:

1. Find the workspace from the connected GitHub App `installation.id`.
2. Read `repository.full_name` from the webhook.
3. Find the Tasks Dash project whose `repositoryFullName` matches that repository.
4. Read that project's stored `key`.
5. Match only `<CONFIGURED_PROJECT_KEY>-<NUMBER>`.
6. Confirm that the Work Item exists in the same workspace before saving GitHub data.

For example, suppose a project is configured as:

```text
Project key: ALPHA
Repository: acme/application
```

Accepted values include:

```text
ALPHA-1
feature/ALPHA-1-login
fix/alpha-12-refresh-token
[ALPHA-28] Handle expired session
```

The same repository will not link `LCSP-1`, `ABC-1`, or any other prefix because those keys do not match the configured project key `ALPHA`.

When another project is configured with key `FARM`, the same matcher uses `FARM-<number>` automatically. There is no `LCSP` constant or fallback in the webhook implementation.

## Detection sources

### Pull request event

The `pull_request` webhook searches:

- PR title;
- PR body;
- source branch name.

A PR can link more than one Work Item, but every detected key must use the configured key of the project mapped to that repository.

Example for a project configured with key `ALPHA`:

```text
PR title: ALPHA-1 add login
Branch: feature/ALPHA-2-validation
```

The PR can link `ALPHA-1` and `ALPHA-2`. A mention such as `FARM-3` is ignored for this project.

### Push event

The `push` webhook searches:

- pushed branch name;
- every commit message in the push;
- the head commit message when it is not already in the commit list.

Example for a project configured with key `FARM`:

```text
Branch: feature/FARM-9-crop-health
Commit: FARM-10 validate disease report
```

The commit is linked to `FARM-9` through the branch and to `FARM-10` through the commit message. A message such as `LCSP-1 unrelated change` is ignored because it does not match the configured project key.

### Pull request review event

The `pull_request_review` webhook updates the detailed review status for each Work Item detected from the PR title, body, or branch using the same configured project key.

## Repository mapping requirement

No link is created when:

- the GitHub App installation is not connected;
- the webhook repository is not mapped to a Tasks Dash project;
- the key prefix differs from the mapped project's configured `key`;
- the matching Work Item does not exist in the workspace.

A project must therefore have both values configured correctly:

```text
key: the prefix used by Work Items, such as ALPHA
repositoryFullName: the GitHub repository, such as acme/application
```

## Stored GitHub data

Each Work Item can store:

- multiple branch names;
- up to 100 recent commits;
- up to 20 pull requests;
- the source used to detect each link;
- PR title, URL, author, source branch, target branch, head SHA, timestamps, lifecycle state, and review state.

Legacy single-PR fields remain readable so existing MongoDB records are not lost.

## PR status shown in Tasks Dash

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

Enable:

- Installation
- Installation repositories
- Pull request
- Pull request review
- Push

Minimum repository permissions:

- Metadata: Read-only
- Contents: Read-only
- Pull requests: Read-only

`Issues: Read and write` is required only when the automation action `CREATE_GITHUB_ISSUE` is enabled.

## Automated verification

CI includes tests proving that:

1. A project configured as `ALPHA` links `ALPHA-2` and ignores `LCSP-1` and `ABC-7` in the same PR payload.
2. A project configured as `FARM` links `FARM-9` from the branch and `FARM-10` from a commit message, while ignoring `LCSP-1`.
3. A repository not mapped to any project creates no Work Item link.

## Production verification matrix

For any configured project, substitute its actual key for `<PROJECT_KEY>`:

1. Open a PR titled `<PROJECT_KEY>-1 add login` and confirm task 1 is linked.
2. Open a PR from branch `feature/<PROJECT_KEY>-2-login` with no key in title/body and confirm task 2 is linked.
3. Push commit `<PROJECT_KEY>-3 validate token` from a branch without a key and confirm task 3 is linked.
4. Push any commit from branch `fix/<PROJECT_KEY>-4-timeout` and confirm task 4 is linked.
5. Mention a different prefix in the same repository and confirm it is ignored.
6. Mark a linked PR as draft, ready for review, approved, changes requested, merged, and closed; confirm the status changes in the task.
7. Redeliver the same webhook and confirm no duplicate delivery processing or duplicate PR/commit record appears.
