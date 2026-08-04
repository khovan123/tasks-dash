# Tasks Dash

Tasks Dash is a production-oriented multi-project delivery workspace built with Next.js, NestJS, MongoDB, GitHub Apps, Google Drive OAuth, Discord webhooks, and invite-only workspace access.

The repository does not ship dashboard mock JSON, demo seed routes, integration demo mode, or client-controlled workspace IDs.

## Current capabilities

- Invite-only GitHub OAuth: a new user cannot create or link an account until a one-time email invitation has been issued.
- Workspace-level member management with invitation queue, resend, revoke, role update, and member removal.
- Owner bootstrap through a secret-protected API that creates and emails the first Owner invitation.
- GitHub App installation tokens, raw-body webhook verification, delivery idempotency, and PR/work-item linking.
- Google Drive read-only OAuth and project folder trees.
- Per-project encrypted Discord webhooks and event/scheduled automation rules.
- Projects, workflows, sprints, Modules, Stories, Tasks, Bugs, Sub-tasks, and Jira-style project keys.
- Work-item Figma component links and document links, each supporting multiple optional entries.
- Project Designer Catalog for Figma files, pages, components, and FigJam boards.
- Persistent backlog ranking with drag-and-drop and accessible up/down controls.

## Architecture

```text
apps/
  api/   NestJS API, MongoDB models, OAuth, integrations, automation workers
  web/   Authenticated Next.js application and BFF proxy
packages/
  contracts/ canonical domain values and API envelopes
```

GitHub Pages publishes only a static product page. The authenticated application must be deployed as the Next.js service.

## First workspace bootstrap

All new OAuth users require an invitation, including the first Owner. After deploying the API and configuring email delivery, create the first workspace invitation:

```bash
curl -X POST https://api.example.com/api/workspace/bootstrap \
  -H 'content-type: application/json' \
  -H 'x-workspace-bootstrap-secret: YOUR_BOOTSTRAP_SECRET' \
  -d '{
    "workspaceName": "My Workspace",
    "workspaceSlug": "my-workspace",
    "ownerEmail": "owner@example.com"
  }'
```

The API sends a one-time invitation email. The Owner must open that link and sign in with a GitHub account whose verified email exactly matches `ownerEmail`.

After login, workspace invitations are managed at `/workspace/members`.

## Development

Copy `.env.example` to `.env`, replace every placeholder, and run:

```bash
npm install
docker compose up -d mongodb
npm run dev
```

There is no seed command. A newly bootstrapped workspace starts empty.

## Build

```bash
npm run typecheck
npm run build
```

Container builds:

```bash
docker build -f apps/api/Dockerfile -t tasks-dash-api .
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api \
  -f apps/web/Dockerfile \
  -t tasks-dash-web .
```

See [`docs/PRODUCTION_SETUP.md`](docs/PRODUCTION_SETUP.md) for environment variables, invitation email configuration, GitHub App permissions, callbacks, and deployment verification.
