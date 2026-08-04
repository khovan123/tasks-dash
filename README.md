# Tasks Dash

Tasks Dash is a production-oriented multi-project delivery workspace built with Next.js, NestJS, MongoDB, GitHub Apps, Google Drive OAuth, Discord webhooks, invite-only access, and multi-workspace membership per GitHub account.

The repository does not ship dashboard mock JSON, demo seed routes, integration demo mode, or client-controlled workspace IDs.

## Current capabilities

- One GitHub identity can belong to multiple workspaces with a separate member record and role in each workspace.
- Invite-only GitHub OAuth: a new identity cannot access any workspace until a one-time email invitation has been accepted.
- Workspace selector, server-validated switching, and Owner-created additional workspaces.
- Workspace-level member management with invitation queue, resend, revoke, role update, and member removal.
- Owner bootstrap through a secret-protected API that creates and emails the first Owner invitation.
- GitHub App installation tokens, raw-body webhook verification, delivery idempotency, and PR/work-item linking.
- Owner-managed Google Drive OAuth using `drive.file`, one application-managed workspace root, and one folder per project.
- Per-project encrypted Discord webhooks and event/scheduled automation rules.
- Projects, workflows, sprints, Modules, Stories, Tasks, Bugs, Sub-tasks, and Jira-style project keys.
- Work-item Figma component links and document links, each supporting multiple optional entries.
- Project Designer Catalog for Figma files, pages, components, and FigJam boards.
- Persistent backlog ranking with drag-and-drop and accessible up/down controls.
- Frontend UI built entirely with Tailwind CSS v4 utilities and source-owned shadcn/ui components under `apps/web/src/components/ui`.

## Frontend design system

The authenticated Next.js application uses Tailwind CSS v4 for layout and styling. Reusable primitives follow the shadcn/ui source model and live in `apps/web/src/components/ui` (`Button`, `Card`, `Badge`, `Field`, `Input`, `NativeSelect`, `Dialog`, `Table`, `Empty`, and related components).

`apps/web/src/app/globals.css` contains only Tailwind imports, design tokens, theme variables, and base styles. Feature-specific semantic stylesheets are not used. CI runs `apps/web/test/shadcn-architecture.test.mjs` to prevent legacy CSS classes or the old `components/atoms` architecture from returning.

## Multi-workspace identity model

```text
GitHub identity
├── Workspace A membership · OWNER
├── Workspace B membership · ADMIN
└── Workspace C membership · MEMBER
```

The OAuth identity and encrypted GitHub user tokens are stored once. Every workspace membership has its own member ID and role. Switching workspace signs a new HttpOnly session containing the selected `workspaceId` and `memberId`; project data and integrations remain isolated by workspace.

Owners can create another workspace at `/workspaces`. Existing GitHub identities can accept invitations to additional workspaces with the same verified GitHub email.

## Architecture

```text
apps/
  api/   NestJS API, MongoDB models, OAuth, integrations, automation workers
  web/   Authenticated Next.js application, Tailwind v4, shadcn/ui source components, BFF proxy
packages/
  contracts/ canonical domain values and API envelopes
```

GitHub Pages publishes only a static product page. The authenticated application must be deployed as the Next.js service.

## First workspace bootstrap

All new OAuth identities require an invitation, including the first Owner. After deploying the API and configuring email delivery, create the first workspace invitation:

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

After login, workspace invitations are managed at `/workspace/members`, and workspace creation/switching is managed at `/workspaces`.

## Development

Copy `.env.example` to `.env`, replace every placeholder, and run:

```bash
npm install
docker compose up -d mongodb
npm run dev
```

There is no seed command. A newly created workspace starts empty.

## Build

```bash
npm run typecheck
npm test
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
