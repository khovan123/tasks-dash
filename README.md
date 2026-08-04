# Tasks Dash

A Jira-inspired multi-project management dashboard with configurable workflows, work items, modules, sprints, boards, project documentation, members, automation rules, and GitHub/Discord/Google Drive integration adapters.

## Live demo

GitHub Pages: https://khovan123.github.io/tasks-dash/

The Pages workflow publishes the static interactive prototype from the repository root. It redeploys automatically whenever `index.html`, `styles.css`, `app.js`, or the Pages workflow changes on `main`.

## Stack

- **Web:** Next.js, React, Tailwind CSS, shadcn-style primitives, Atomic Design, feature-based modules
- **API:** NestJS, CQRS, dependency injection, Clean Architecture boundaries, DDD-oriented domain models, cron/webhook/workflow jobs
- **Database:** MongoDB via Mongoose
- **Contracts:** shared canonical constants, DTOs, and success/problem envelopes

## Implemented MVP

- Portfolio overview with progress, activity, member presence, project health, and daily work-item statistics
- Sidebar containing every project and Jira-style project keys
- Project overview, backlog, sprint board, configurable workflow builder, docs explorer, members, and automation screens
- Work item types: Module, Story, Task, Bug, Sub-task
- Jira-like metadata: status, priority, labels, sprint, module, reporter, assignee, dates, points, linked GitHub PR
- GitHub webhook ingestion and PR/work-item key linking
- Discord webhook notification adapter
- Google Drive project-root/folder tree adapter
- Scheduled automation runner and event-driven automation rule model
- MongoDB seed endpoint for local/demo data

## Start locally

```bash
cp .env.example .env
npm install
docker compose up -d mongodb
npm run dev
```

Open `http://localhost:3000`. API Swagger is at `http://localhost:4000/api/docs`.

Seed demo database:

```bash
curl -X POST http://localhost:4000/api/demo/seed
```

## Integration setup

The UI remains usable in demo mode. For live connections, configure the environment variables in `.env` and register the corresponding callback/webhook URLs:

- GitHub webhook: `POST /api/integrations/github/webhook`
- Google Drive callback: `GET /api/integrations/google-drive/callback`
- Discord: use `DISCORD_WEBHOOK_URL`

## Architecture

```text
apps/
  api/   NestJS feature modules, CQRS handlers, domain and infrastructure boundaries
  web/   Next.js App Router, Atomic Design components, feature modules, BFF helpers
packages/
  contracts/ canonical shared values and API contracts
```

See `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, and `docs/INTEGRATIONS.md`.
