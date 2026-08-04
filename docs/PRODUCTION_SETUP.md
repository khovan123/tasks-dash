# Tasks Dash production setup

Tasks Dash uses invite-only workspace access. New GitHub OAuth users are rejected unless they arrive through a valid, unexpired, one-time invitation whose email matches the verified GitHub email.

## 1. Production topology

Deploy:

- `tasks-dash-api`: NestJS API at `https://api.example.com`.
- `tasks-dash-web`: Next.js application at `https://app.example.com`.
- MongoDB Atlas or another TLS-enabled replica set.
- A verified Resend sending domain for invitation email.

GitHub Pages is only the static marketing page.

## 2. Required secrets

```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 32   # INTEGRATION_ENCRYPTION_KEY
openssl rand -base64 48   # GITHUB_APP_WEBHOOK_SECRET
openssl rand -base64 48   # WORKSPACE_BOOTSTRAP_SECRET
```

Store generated values in the hosting platform's secret manager. Invitation variables:

```text
WORKSPACE_BOOTSTRAP_SECRET=...
INVITE_TTL_HOURS=72
RESEND_API_KEY=re_...
INVITE_EMAIL_FROM=Tasks Dash <invite@your-domain.com>
```

## 3. Bootstrap the first Owner

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

The Owner accepts the invitation with the matching verified GitHub email. Owner/Admin users then manage workspace-level invitations at `/workspace/members`.

## 4. GitHub App

Configure:

- Homepage URL: `https://app.example.com`
- User authorization callback: `https://api.example.com/api/auth/github/callback`
- Setup URL: `https://api.example.com/api/integrations/github/setup`
- Webhook URL: `https://api.example.com/api/integrations/github/webhook`

Permissions:

- Account email addresses: Read-only
- Metadata: Read-only
- Contents: Read-only
- Pull requests: Read-only
- Issues: Read and write only when `CREATE_GITHUB_ISSUE` is enabled

Events:

- Installation
- Installation repositories
- Pull request
- Pull request review
- Push

Projects do not accept free-text `repositoryFullName`. The project screen sends a numeric `repositoryId`; the backend verifies it through the installation and stores GitHub's canonical `full_name`.

## 5. Google Drive workspace root

Create a Google OAuth Web client and enable Google Drive API.

Authorized redirect URI:

```text
https://api.example.com/api/integrations/google-drive/callback
```

Declare these consent-screen and application scopes:

```text
openid
email
https://www.googleapis.com/auth/drive.file
```

Set:

```text
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
GOOGLE_DRIVE_REDIRECT_URI=https://api.example.com/api/integrations/google-drive/callback
```

### Ownership and folder model

Only a workspace `OWNER` can start Google OAuth. The encrypted refresh token belongs to the Owner-authorized Google account and is used server-side for every workspace member.

After OAuth succeeds, Tasks Dash automatically creates or reuses an app-managed folder:

```text
Tasks Dash - <Workspace Name>/
  <PROJECT_KEY> - <Project Name>/
```

Existing projects receive project folders during OAuth synchronization. New projects trigger automatic folder provisioning. Opening a project's Docs screen retries provisioning if Drive was temporarily unavailable.

Projects do not accept `driveRootFolderId` from the UI or API. Members cannot link arbitrary Drive folders. Each managed root and project folder is tagged with private Google Drive `appProperties` for its workspace and project.

### Member operations

`OWNER`, `ADMIN`, `PROJECT_LEAD`, and `MEMBER` roles can:

- create nested folders;
- upload files up to 25 MB through the current UI;
- rename files and folders;
- move files/folders to Google Drive trash;
- browse the live Drive folder tree.

`VIEWER` remains read-only. The project root itself cannot be renamed or deleted.

Before every create, rename, delete, or upload, the backend walks the Drive `parents` chain and confirms the item or parent is under that project's managed root. An ID from another project, another workspace, or another Drive location is rejected.

Endpoints:

```text
GET    /api/integrations/google-drive/status
GET    /api/integrations/google-drive/projects/:projectKey/tree
POST   /api/integrations/google-drive/projects/:projectKey/folders
POST   /api/integrations/google-drive/projects/:projectKey/upload
PATCH  /api/integrations/google-drive/projects/:projectKey/items/:fileId
DELETE /api/integrations/google-drive/projects/:projectKey/items/:fileId
```

## 6. Discord

Create an incoming webhook in the target Discord channel and connect it from **Settings → Integrations**. Webhook URLs are verified, encrypted with AES-256-GCM, and never returned to the frontend.

## 7. Project delivery data

Each project supports:

- GitHub repository selection from the connected installation;
- Designer Catalog for Figma files/pages/components/FigJam;
- work items with many-value Figma and document links;
- Module, Task, Bug, Story, and Sub-task creation;
- persistent drag-and-drop backlog order;
- a live Google Drive Docs screen backed by the Owner-managed project folder.

## 8. Database and network rules

- Require TLS and a MongoDB replica set.
- Restrict database access to the API service.
- Back up workspace, member, project, work-item, integration, design-catalog, and automation collections.
- Preserve the exact GitHub webhook request body through proxies.
- Deploy Web/API on sibling HTTPS subdomains and set `COOKIE_DOMAIN` to their shared parent domain.
- Configure reverse proxies to allow multipart uploads up to at least 25 MB.

## 9. Build and health check

```bash
docker build -f apps/api/Dockerfile -t tasks-dash-api:latest .
docker build -f apps/web/Dockerfile -t tasks-dash-web:latest .
```

```text
TASKS_DASH_API_BASE_URL=https://api.example.com/api
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api
```

Health: `GET https://api.example.com/api/health`.

## 10. End-to-end verification

1. Confirm a new user cannot sign in without an invitation.
2. Bootstrap the first Owner and accept the invitation.
3. Create projects before connecting Drive.
4. Sign in as the Owner and connect Google Drive.
5. Confirm the workspace root and one child folder per existing project appear in the Owner's Drive.
6. Create another project and confirm its folder is provisioned automatically.
7. Sign in as a Member and create a nested folder, upload a file, rename it, and delete it from the project's Docs screen.
8. Attempt the same mutation with a file or folder ID from another project and confirm HTTP 403.
9. Confirm the project root cannot be renamed or deleted.
10. Confirm a Viewer cannot mutate Drive content.
11. Link a GitHub repository by repository ID and verify PR/commit task matching.
12. Connect Discord and verify automation delivery.
