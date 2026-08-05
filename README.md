# Tasks Dash

Tasks Dash is a production-oriented multi-project delivery workspace built with Next.js, NestJS, MongoDB, GitHub OAuth, GitHub Apps, Discord Bot storage, SMTP invitation email, and multi-workspace membership per GitHub account.

## Current capabilities

- One GitHub identity can belong to multiple workspaces with a separate role in each workspace.
- Invite-only GitHub OAuth with SMTP invitations.
- Owner-created workspaces and server-validated workspace switching.
- GitHub App installation tokens, signed webhook verification, delivery idempotency, repository selection, and PR/work-item linking.
- Discord Bot provisioning of two channels per project: Updates and Docs.
- GitHub PR opened/merged notifications delivered to each project's Updates channel.
- Virtual document folders, metadata, tags, file versions, download, deletion, and direct Discord message links.
- Document metadata and structure stored in MongoDB; file bytes stored as Discord message attachments.
- Projects, workflows, sprints, Modules, Stories, Tasks, Bugs, Sub-tasks, Designer Catalog, and persistent backlog ranking.
- Frontend built with Tailwind CSS v4 and source-owned shadcn/ui components.

## Document storage model

```text
MongoDB
├── document_folders
├── documents
└── document_versions

Discord project channel
└── #<project-key>-docs
    ├── message + attachment for document v1
    ├── message + attachment for document v2
    └── message + attachment for document v3
```

Tasks Dash stores `guildId`, `channelId`, `messageId`, and `attachmentId` for each version. The UI fetches the Discord message again before download so it receives a current attachment URL. “Open in Discord” navigates to the exact message containing the selected file version.

Google OAuth and Google Drive are not used.

## Multi-workspace identity model

```text
GitHub identity
├── Workspace A membership · OWNER
├── Workspace B membership · ADMIN
└── Workspace C membership · MEMBER
```

Every workspace keeps projects, repository mappings, Discord server configuration, channels, members, and document metadata isolated by `workspaceId`.

## Architecture

```text
apps/
  api/   NestJS API, MongoDB models, GitHub OAuth/App, SMTP, Discord automation/docs
  web/   Next.js, Tailwind v4, shadcn/ui, authenticated BFF
packages/
  contracts/ canonical domain values and API envelopes
```

## Development

```bash
cp .env.example .env
npm install
docker compose up -d mongodb
npm run dev
```

There is no seed command. A new workspace starts empty.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

See [`docs/PRODUCTION_SETUP.md`](docs/PRODUCTION_SETUP.md) for production configuration and end-to-end verification.
