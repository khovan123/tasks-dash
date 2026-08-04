# Tasks Dash

Tasks Dash is a production-oriented multi-project delivery workspace built with Next.js, NestJS, MongoDB, GitHub Apps, Google Drive OAuth, and Discord webhooks.

The repository does **not** ship dashboard mock JSON, a demo seed endpoint, integration demo mode, or a client-controlled workspace fallback. Outside the test environment, the API fails during startup when mandatory database, OAuth, encryption, or GitHub App configuration is missing.

## Architecture

```text
apps/
  api/   NestJS API, MongoDB models, GitHub/Drive/Discord integrations, automation workers
  web/   Authenticated Next.js application and BFF proxy
packages/
  contracts/ canonical domain values and API envelopes
```

GitHub Pages publishes only the static product/architecture page. The authenticated application must be deployed as the Next.js service.

## Production capabilities

- GitHub user authorization with a signed HttpOnly session cookie.
- Encrypted GitHub user tokens with refresh-token rotation.
- GitHub App JWT and one-hour installation access tokens.
- Installation ownership verification before linking a workspace.
- Raw-body HMAC verification and idempotent GitHub webhook processing.
- Pull-request/work-item linking from project keys in titles, bodies, or branches.
- Per-project Discord webhooks encrypted with AES-256-GCM.
- Event and scheduled automation rules with execution locks and run history.
- Google Drive read-only OAuth with encrypted refresh tokens and project folder trees.
- MongoDB-backed projects, workflows, work items, sprints, members, integrations, and automation runs.

## Development

Copy `.env.example` to `.env`, replace every placeholder, and run:

```bash
npm install
docker compose up -d mongodb
npm run dev
```

There is no seed command. A newly authenticated workspace starts empty by design.

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

See [`docs/PRODUCTION_SETUP.md`](docs/PRODUCTION_SETUP.md) for GitHub App permissions, callback URLs, Google OAuth, Discord, MongoDB, cookie-domain requirements, secret generation, and verification steps.
