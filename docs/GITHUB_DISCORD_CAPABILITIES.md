# GitHub App x Discord Bot Capabilities

Updated on August 6, 2026.

## Current Discord Slash Commands

### Pull Requests

- `/prs list [project_key]`: list open pull requests.
- `/prs merge pr [project_key]`: merge a pull request.
- `/prs comment pr text [project_key]`: comment on a pull request.
- `/prs assign pr github_username [project_key]`: assign a user to a pull request.
- `/prs review-request pr github_username [project_key]`: request a reviewer.
- `/prs approve pr [text] [project_key]`: submit an approval review.
- `/prs request-changes pr text [project_key]`: request changes in a review.
- `/prs close pr [project_key]`: close a pull request.
- `/prs reopen pr [project_key]`: reopen a pull request.

### Issues

- `/issues list [project_key]`: list open issues.
- `/issues create title text [project_key|repository]`: create an issue in a mapped project repository or an installed repository.
- `/issues comment issue text [project_key]`: comment on an issue.
- `/issues assign issue github_username [project_key]`: assign a user to an issue.
- `/issues close issue [project_key]`: close an issue.
- `/issues reopen issue [project_key]`: reopen an issue.

### Workflows

- `/workflows list [project_key]`: list recent GitHub Actions workflow runs.
- `/workflows rerun run [project_key]`: rerun a workflow run.
- `/workflows cancel run [project_key]`: cancel a workflow run.
- `/workflows rerun-failed run [project_key]`: rerun only failed jobs from a workflow run.

### Checks

- `/checks list [project_key]`: list recent check suites on linked repositories.
- `/checks rerequest suite [project_key]`: rerequest a check suite.

### Deployments

- `/deployments list [project_key]`: list recent deployments with latest known status.
- `/deployments mark deployment state [description] [environment_url] [project_key]`: create a deployment status update.

### Security Alerts

- `/dependabot list [project_key]`: list open Dependabot alerts.
- `/dependabot dismiss alert reason [comment] [project_key]`: dismiss a Dependabot alert.
- `/dependabot reopen alert [project_key]`: reopen a Dependabot alert.
- `/code-scanning list [project_key]`: list open code scanning alerts.
- `/code-scanning dismiss alert reason [comment] [project_key]`: dismiss a code scanning alert.
- `/code-scanning reopen alert [project_key]`: reopen a code scanning alert.

### Repositories

- `/repos list`: list repositories currently accessible to the GitHub App installation.

## GitHub Webhook Triggers Already Implemented

The backend currently processes these GitHub App webhook events:

- `installation`
- `installation_repositories`
- `pull_request`
- `pull_request_review`
- `pull_request_review_comment`
- `issue_comment`
- `push`
- `workflow_run`

These are handled in `GithubWebhookService` and already feed Discord notifications and/or work item linking where applicable.

## Trigger Families Unlocked By Broad GitHub App Permissions

With the broad repository, organization, and account permissions shown in the GitHub App settings screenshot, GitHub can expose webhook subscriptions and API actions across these families:

- Repository lifecycle: `create`, `delete`, `public`, `repository`, `repository_import`, `repository_ruleset`.
- Source control and collaboration: `push`, `pull_request`, `pull_request_review`, `pull_request_review_comment`, `issue_comment`, `issues`, `label`, `milestone`, `merge_group`.
- CI/CD and automation: `check_run`, `check_suite`, `workflow_run`, `workflow_job`, `deployment`, `deployment_status`, `status`, `branch_protection_rule`.
- Security and compliance: `code_scanning_alert`, `dependabot_alert`, `dependabot_security_advisory`, `repository_advisory`, `secret_scanning_alert`, `secret_scanning_alert_location`, `secret_scanning_scan`, `security_and_analysis`.
- Discussions and knowledge: `discussion`, `discussion_comment`, `gollum`, `page_build`, `project`, `project_card`, `project_column`, `projects_v2`, `projects_v2_item`.
- Membership and governance: `member`, `membership`, `team`, `team_add`, `organization`, `org_block`, `personal_access_token_request`.
- Notifications and meta: `commit_comment`, `fork`, `watch`, `meta`, `github_app_authorization`.

## Recommended Next Expansions

High-value follow-up work that the current permission set can support cleanly:

- Add commit status and check run drill-down commands, not just check suite rerequest.
- Add deployment thread sync so every deployment can stream status changes into Discord.
- Add alert assignee commands for Dependabot and code scanning triage flows.
- Add repository governance commands: labels, branch protection visibility, repository variables/secrets status.
