# Tasks Dash production setup

Tasks Dash uses GitHub OAuth for user identity, a GitHub App for repository/webhook access, SMTP for invitations, MongoDB for application data, and a Discord Bot for project notifications and document attachment storage. Google OAuth and Google Drive are not used.

## 1. Required services

- NestJS API at `https://api.example.com`.
- Next.js app at `https://app.example.com`.
- MongoDB Atlas or another TLS-enabled replica set.
- SMTP relay.
- One GitHub App.
- One Discord Application with a Bot user.

## 2. Internal secrets

```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 32   # INTEGRATION_ENCRYPTION_KEY
openssl rand -base64 48   # GITHUB_APP_WEBHOOK_SECRET
openssl rand -base64 48   # WORKSPACE_BOOTSTRAP_SECRET
```

Configure the variables in `.env.example`. The API validates required values during startup.

## 3. GitHub OAuth and GitHub App

Configure the GitHub App:

```text
Homepage URL: https://app.example.com
User authorization callback: https://api.example.com/api/auth/github/callback
Setup URL: https://api.example.com/api/integrations/github/setup
Webhook URL: https://api.example.com/api/integrations/github/webhook
```

Permissions:

- Account email addresses: Read-only
- Metadata: Read-only
- Contents: Read-only
- Pull requests: Read-only
- Issues: Read/write only when issue creation automation is enabled

Events:

- Installation
- Installation repositories
- Pull request
- Pull request review
- Push

Set the GitHub App Client ID/Secret, App ID/slug, webhook secret, and PEM private key in the API secret manager.

## 4. Discord Bot

Set:

```text
DISCORD_APPLICATION_ID=123456789012345678
DISCORD_BOT_TOKEN=store-only-in-secret-manager
```

The generated bot installation URL requests permissions required to:

- view project channels;
- send messages;
- attach files;
- read message history;
- manage project channels;
- manage messages;
- manage incoming webhooks.

From **Settings → Integrations**, Owner/Admin configures:

- Guild ID;
- optional Category ID;
- Updates channel template, default `{{projectKey}}-updates`;
- Docs channel template, default `{{projectKey}}-docs`.

Provisioning creates or reuses both channels for every existing project. A new project triggers the same provisioning automatically.

## 5. Discord document model

Folder structure is virtual and stored in MongoDB. File bytes are Discord attachments.

Collections:

```text
document_folders
documents
document_versions
```

Each version stores:

```text
workspaceId
projectKey
documentId
version
fileName
mimeType
size
discordGuildId
discordChannelId
discordMessageId
discordAttachmentId
uploadedByMemberId
```

Current upload limit is 10 MiB per file. The API creates a Discord message in the project's Docs channel and records the returned message/attachment IDs. Download requests fetch the message again before redirecting to the current signed attachment URL.

Endpoints:

```text
GET    /api/projects/:projectKey/documents
POST   /api/projects/:projectKey/documents/folders
PATCH  /api/projects/:projectKey/documents/folders/:folderId
DELETE /api/projects/:projectKey/documents/folders/:folderId
POST   /api/projects/:projectKey/documents/upload
POST   /api/projects/:projectKey/documents/:documentId/versions
PATCH  /api/projects/:projectKey/documents/:documentId
DELETE /api/projects/:projectKey/documents/:documentId
GET    /api/projects/:projectKey/documents/:documentId/download
```

Owner, Admin, Project Lead, and Member can mutate documents. Viewer remains read-only. Folder deletion is allowed only when the folder is empty. Deleting a document deletes its Discord version messages before deleting MongoDB metadata.

## 6. SMTP invitations

Use implicit TLS on port 465 or STARTTLS on port 587. `SMTP_USERNAME` and `SMTP_PASSWORD` must be configured together unless using a trusted relay without authentication.

## 7. First workspace

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

## 8. End-to-end verification

1. Accept the Owner invitation using the matching verified GitHub email.
2. Install the GitHub App and link a repository by repository ID.
3. Install the Discord Bot and configure Guild/Category plus both channel templates.
4. Confirm every project has one Updates channel and one Docs channel.
5. Create a new project and confirm both channels are provisioned automatically.
6. Upload a document from the project Docs screen and confirm a Discord message attachment appears.
7. Click **Open in Discord** and confirm the exact file message opens.
8. Download the file through Tasks Dash and confirm the API refreshes the Discord attachment URL.
9. Create nested virtual folders, edit metadata, upload a new version, and delete the document.
10. Open/merge a PR containing a valid work-item key and confirm notifications arrive in the Updates channel.

## 9. Migration from Google Drive

Deploying this version stops all Google OAuth and Drive API usage. Existing Google Drive files are not copied automatically. Export or migrate required files before removing old Google credentials. The obsolete `google_drive_integrations` collection and old Drive fields may be removed from the database after verification.
