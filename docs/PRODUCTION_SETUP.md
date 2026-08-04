# Tasks Dash production setup

Tasks Dash uses invite-only workspace access. New GitHub OAuth users are rejected unless they arrive through a valid, unexpired, one-time invitation whose email matches the verified GitHub email.

## 1. Production topology

Deploy:

- `tasks-dash-api`: NestJS API at `https://api.example.com`.
- `tasks-dash-web`: Next.js application at `https://app.example.com`.
- MongoDB Atlas or another TLS-enabled replica set.
- A verified Resend sending domain for invitation email.

GitHub Pages is only the static marketing page.

## 2. Generate secrets

```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 32   # INTEGRATION_ENCRYPTION_KEY
openssl rand -base64 48   # GITHUB_APP_WEBHOOK_SECRET
openssl rand -base64 48   # WORKSPACE_BOOTSTRAP_SECRET
```

Store all generated values in the hosting platform's secret manager.

Required invitation variables:

```text
WORKSPACE_BOOTSTRAP_SECRET=...
INVITE_TTL_HOURS=72
RESEND_API_KEY=re_...
INVITE_EMAIL_FROM=Tasks Dash <invite@your-domain.com>
```

Invitation tokens are generated with 256 bits of randomness. MongoDB stores only a SHA-256 hash. The raw token is sent in the email link and held briefly in an HttpOnly cookie while GitHub OAuth completes.

## 3. Bootstrap the first Owner

No OAuth login can create the first Owner implicitly. Create a bootstrap invitation after deployment:

```bash
curl -X POST https://api.example.com/api/workspace/bootstrap \
  -H 'content-type: application/json' \
  -H 'x-workspace-bootstrap-secret: YOUR_BOOTSTRAP_SECRET' \
  -d '{
    "workspaceName": "Delivery Workspace",
    "workspaceSlug": "delivery-workspace",
    "ownerEmail": "owner@example.com"
  }'
```

The endpoint creates a workspace and sends an Owner invitation. The Owner opens the email link and signs in with GitHub. The verified GitHub email must exactly match the invitation email.

After the first login, Owner/Admin users manage invitations at:

```text
https://app.example.com/workspace/members
```

Supported operations:

- invite by email and workspace role;
- resend a pending/expired invitation with a new token;
- revoke an invitation;
- update workspace role;
- remove a member;
- protect the final Owner from removal or demotion.

Members are workspace-level. Projects do not maintain separate member lists. Project lead and work-item assignee IDs reference workspace members.

## 4. Register the GitHub App

Use:

- Homepage URL: `https://app.example.com`
- User authorization callback: `https://api.example.com/api/auth/github/callback`
- Setup URL: `https://api.example.com/api/integrations/github/setup`
- Webhook URL: `https://api.example.com/api/integrations/github/webhook`

Keep expiring user access tokens enabled. Configure account permission **Email addresses: Read-only**.

Minimum repository permissions:

- Metadata: Read-only
- Contents: Read-only
- Pull requests: Read-only
- Issues: Read and write when `CREATE_GITHUB_ISSUE` is used

Subscribe to:

- Installation
- Installation repositories
- Pull request

Generate a private key and store the PEM as base64:

```bash
base64 -w 0 tasks-dash.private-key.pem
```

Set `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY_BASE64`, `GITHUB_APP_WEBHOOK_SECRET`, `GITHUB_OAUTH_CLIENT_ID`, and `GITHUB_OAUTH_CLIENT_SECRET`.

## 5. Google Drive

Create a Web OAuth client and enable Google Drive API.

Authorized redirect URI:

```text
https://api.example.com/api/integrations/google-drive/callback
```

Scopes:

```text
openid
email
https://www.googleapis.com/auth/drive.readonly
```

Set `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, and `GOOGLE_DRIVE_REDIRECT_URI`.

## 6. Discord

Create an incoming webhook in the target Discord channel and connect it to a project from **Settings → Integrations**. Webhook URLs are verified, encrypted with AES-256-GCM, and never returned to the frontend.

## 7. Project delivery data

Each project now supports:

- Designer Catalog entries linking to Figma files, pages, components, and FigJam boards;
- work items with optional many-value `figmaLinks` and `documentLinks`;
- Task, Module, Bug, Story, and Sub-task creation forms;
- persistent backlog order through the numeric `rank` field;
- drag-and-drop reranking through `PATCH /api/projects/:projectKey/work-items/reorder`.

When the first work item is created for a project without a workflow, the backend creates a default To do → In progress → Done workflow.

## 8. Database and network rules

- Require TLS for MongoDB.
- Use a replica set to support transactional invitation acceptance.
- Restrict MongoDB network access to the API service.
- Use a dedicated database user.
- Back up workspaces, members, workspace invitations, auth users, projects, work items, workflows, integrations, design catalog items, automation rules, and automation runs.
- Preserve the exact GitHub webhook request body through proxies.
- Deploy Web/API on sibling HTTPS subdomains and set `COOKIE_DOMAIN` to their shared parent domain.

## 9. Build and health check

```bash
docker build -f apps/api/Dockerfile -t tasks-dash-api:latest .
docker build -f apps/web/Dockerfile -t tasks-dash-web:latest .
```

Web variables:

```text
TASKS_DASH_API_BASE_URL=https://api.example.com/api
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api
```

Health check:

```text
GET https://api.example.com/api/health
```

## 10. End-to-end verification

1. Try GitHub OAuth without an invitation using a new email and confirm HTTP 401.
2. Bootstrap the first Owner and confirm the email arrives.
3. Open the invite link and confirm only the matching verified GitHub email is accepted.
4. Invite another member from `/workspace/members` and verify resend/revoke/role/remove actions.
5. Create a project and create Module, Task, and Bug work items.
6. Add multiple Figma component links and document links to a work item and open them from the project table.
7. Add Figma links to Designer Catalog.
8. Drag work items in Backlog, refresh, and confirm order persists.
9. Install the GitHub App and verify a PR containing a work item key is linked.
10. Connect Discord and Google Drive and inspect integration errors/automation runs.
