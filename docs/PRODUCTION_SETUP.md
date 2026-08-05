# Tasks Dash production setup

Tasks Dash uses invite-only workspace access. New GitHub OAuth users are rejected unless they arrive through a valid, unexpired, one-time invitation whose email matches the verified GitHub email.

## 1. Production topology

Deploy:

- `tasks-dash-api`: NestJS API at `https://api.example.com`.
- `tasks-dash-web`: Next.js application at `https://app.example.com`.
- MongoDB Atlas or another TLS-enabled replica set.
- A production SMTP account or trusted SMTP relay for invitation email.

GitHub Pages is only the static marketing page.

## 2. Required secrets

```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 32   # INTEGRATION_ENCRYPTION_KEY
openssl rand -base64 48   # GITHUB_APP_WEBHOOK_SECRET
openssl rand -base64 48   # WORKSPACE_BOOTSTRAP_SECRET
```

Store generated values in the hosting platform's secret manager.

### Invitation SMTP

Port 587 with STARTTLS:

```text
WORKSPACE_BOOTSTRAP_SECRET=...
INVITE_TTL_HOURS=72
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_STARTTLS=true
SMTP_ALLOW_INSECURE=false
SMTP_USERNAME=invite@your-domain.com
SMTP_PASSWORD=store-only-in-secret-manager
SMTP_FROM=Tasks Dash <invite@your-domain.com>
SMTP_HELO_NAME=api.example.com
SMTP_CONNECTION_TIMEOUT_MS=10000
```

For implicit TLS on port 465, use `SMTP_PORT=465`, `SMTP_SECURE=true`, and `SMTP_STARTTLS=false`. `SMTP_USERNAME` and `SMTP_PASSWORD` are optional only when the selected SMTP relay accepts unauthenticated mail from the API network; when one is set, both are required. Plaintext SMTP is rejected unless `SMTP_ALLOW_INSECURE=true` is explicitly configured for a trusted local development relay.

The API sends MIME multipart email with UTF-8 text and HTML bodies. Credentials remain server-side and SMTP errors returned to clients never include the configured password.

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

The webhook endpoint requires `X-GitHub-Delivery`, verifies `X-Hub-Signature-256` against the raw request body, stores delivery idempotency state, and resolves the workspace/project through the GitHub App installation plus the repository canonical `full_name`.

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

## 6. Discord bot, project channels, and GitHub delivery

Create a Discord application with a bot user, then set:

```text
DISCORD_APPLICATION_ID=123456789012345678
DISCORD_BOT_TOKEN=store-only-in-secret-manager
```

The token is server-side only and is never stored in MongoDB or returned to the browser. From **Settings → Integrations**, an Owner/Admin installs the bot and configures:

- Discord Guild ID;
- optional Category ID;
- channel template, default `{{projectKey}}-updates`.

The bot authorization requests only `MANAGE_CHANNELS` and `MANAGE_WEBHOOKS`. The server validates that the guild is accessible and that the optional category belongs to that guild.

On configuration, Tasks Dash provisions every existing project. New `projects.created` events automatically provision later projects. Provisioning is idempotent at the database level and will reuse a matching text channel in the configured category before creating a new one.

For each project, Tasks Dash:

1. renders and normalizes the channel name to Discord's lowercase 100-character limit;
2. creates or reuses the text channel;
3. creates an incoming webhook in that channel;
4. encrypts the webhook URL with AES-256-GCM;
5. sends a connection test message;
6. creates default `Pull request opened` and `Pull request merged` Discord automation rules.

GitHub events then flow as:

```text
GitHub App webhook
→ raw-body HMAC verification and delivery deduplication
→ repository mapped to the configured workspace project
→ project key extracted from PR title/body/branch or commit message
→ work item updated with branch, commit and PR status
→ event automation runs
→ encrypted project Discord webhook posts into that project's channel
```

Only events matching a real work item key for the repository's configured project trigger the default PR notifications.

Endpoints:

```text
GET  /api/integrations/discord/install
GET  /api/integrations/discord/workspace/status
POST /api/integrations/discord/workspace/configure
POST /api/integrations/discord/workspace/provision-all
POST /api/integrations/discord/projects/:projectKey/provision
GET  /api/integrations/discord/status
POST /api/integrations/discord/projects/:projectKey/test
```

`POST /discord/projects/:projectKey/provision` accepts optional `channelName` and `topic` for a project-specific override. Manual incoming webhook connection remains available only as a compatibility fallback.

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
- Allow outbound TCP from the API service to the configured SMTP host and port.
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

1. Configure SMTP and send a workspace invitation; confirm both text and HTML bodies arrive and the acceptance URL works.
2. Confirm a new user cannot sign in without an invitation.
3. Bootstrap the first Owner and accept the invitation.
4. Create projects before connecting Drive.
5. Sign in as the Owner and connect Google Drive.
6. Confirm the workspace root and one child folder per existing project appear in the Owner's Drive.
7. Create another project and confirm its folder is provisioned automatically.
8. Sign in as a Member and create a nested folder, upload a file, rename it, and delete it from the project's Docs screen.
9. Attempt the same mutation with a file or folder ID from another project and confirm HTTP 403.
10. Confirm the project root cannot be renamed or deleted.
11. Confirm a Viewer cannot mutate Drive content.
12. Install the GitHub App and link a repository by repository ID.
13. Install the Discord bot, configure Guild/Category/template, and verify existing project channels are provisioned.
14. Create a new project and confirm its Discord channel and webhook are created automatically.
15. Create a task, include its exact project key in a branch and PR title, then confirm the task displays the PR state.
16. Open and merge the PR and confirm the project's Discord channel receives both default automation messages exactly once per GitHub delivery/work item.
