# Integrations

## GitHub

A GitHub webhook is verified with `GITHUB_WEBHOOK_SECRET`. Work-item keys are extracted from branch names, PR titles, PR bodies, and commit messages. PR events update linked work-item metadata and can transition work items through automation rules.

Recommended events: `pull_request`, `push`, `issues`, `workflow_run`.

## Discord

Automation actions send structured embeds to the configured webhook. Per-project channels can be added by storing a project-specific webhook secret reference rather than a raw URL.

## Google Drive

Each project stores a `driveRootFolderId`. The docs explorer requests descendants below that root, preserving Drive hierarchy. Production deployments should encrypt refresh tokens and keep only token references in MongoDB.

## Security

- Never persist raw GitHub private keys or Discord webhook URLs in project documents.
- Verify webhook signatures before dispatch.
- Use a secret manager in production.
- Apply project membership checks to every project-scoped query and command.
