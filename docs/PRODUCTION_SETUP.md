# Tasks Dash production setup

Tasks Dash no longer contains a demo seed route, integration demo mode, static dashboard JSON, or a client-controlled workspace fallback. The API intentionally refuses to start outside `NODE_ENV=test` when required production configuration is missing.

## 1. Production topology

Deploy two services from the same repository:

- `tasks-dash-api`: NestJS API exposed at `https://api.example.com`.
- `tasks-dash-web`: Next.js application exposed at `https://app.example.com`.
- MongoDB Atlas or another TLS-enabled MongoDB replica set.

GitHub Pages is only the public marketing page. It does not host the authenticated application or API.

## 2. Generate application secrets

Generate secrets locally and put them in the hosting platform's secret manager. Never commit the generated values.

```bash
openssl rand -base64 48   # SESSION_SECRET
openssl rand -base64 32   # INTEGRATION_ENCRYPTION_KEY
openssl rand -base64 48   # GITHUB_APP_WEBHOOK_SECRET
```

`INTEGRATION_ENCRYPTION_KEY` encrypts GitHub user access/refresh tokens, Discord webhook URLs, and Google refresh tokens with AES-256-GCM. Rotating this key requires decrypting and re-encrypting stored integration credentials first.

## 3. Register the GitHub App

Create a GitHub App in the GitHub account or organization that owns the integration.

Use these URLs:

- Homepage URL: `https://app.example.com`
- User authorization callback URL: `https://api.example.com/api/auth/github/callback`
- Setup URL: `https://api.example.com/api/integrations/github/setup`
- Webhook URL: `https://api.example.com/api/integrations/github/webhook`

Leave **Request user authorization (OAuth) during installation** disabled because this deployment uses a Setup URL. Keep expiring user access tokens enabled; the backend encrypts and rotates the returned refresh token. Sign-in uses the explicit GitHub web application flow with the same GitHub App client ID and client secret. Configure the GitHub App account permission **Email addresses: Read-only** so private verified email addresses can be loaded.

Minimum repository permissions:

- Metadata: Read-only
- Contents: Read-only
- Pull requests: Read-only
- Issues: Read and write, required only for the `CREATE_GITHUB_ISSUE` automation action
- Actions: Read-only, required only when workflow-run events are enabled later

Subscribe to these events:

- Installation
- Installation repositories
- Pull request

Generate a private key and store the complete PEM as base64:

```bash
base64 -w 0 tasks-dash.private-key.pem
```

Set `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY_BASE64`, `GITHUB_APP_WEBHOOK_SECRET`, `GITHUB_OAUTH_CLIENT_ID`, and `GITHUB_OAUTH_CLIENT_SECRET`.

After deployment, sign in to Tasks Dash and choose **Install GitHub App**. The installation URL carries a one-time state value. The setup callback consumes that state and uses the encrypted GitHub user access token to confirm that the signed-in user can access the installation before associating it with the workspace. Repository automation uses one-hour installation tokens generated from a short-lived App JWT; it does not use a personal access token.

## 4. Configure Google OAuth

Create a Web OAuth client in Google Cloud Console and enable Google Drive API.

Authorized redirect URI:

```text
https://api.example.com/api/integrations/google-drive/callback
```

Set the consent screen scopes to:

```text
openid
email
https://www.googleapis.com/auth/drive.readonly
```

Set `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET`, and `GOOGLE_DRIVE_REDIRECT_URI`. The backend requests offline access, encrypts the refresh token, and lists folders from each project's configured `driveRootFolderId`.

## 5. Configure Discord

Create an incoming webhook in the target Discord channel. In Tasks Dash, connect the webhook to a project key from **Settings → Integrations**.

The backend:

- accepts only HTTPS Discord webhook URLs;
- verifies the webhook by requesting its metadata;
- encrypts the URL before storing it;
- sends with `allowed_mentions.parse=[]` to prevent accidental mentions;
- retries one rate-limited request using Discord's `retry_after` response.

Do not put Discord webhook URLs in environment variables or frontend code.

## 6. Database and network rules

- Require TLS for MongoDB.
- Restrict MongoDB network access to the API service.
- Create a dedicated database user with access only to the Tasks Dash database.
- Back up `auth_users`, projects, work items, workflows, integrations, automation rules, and automation runs.
- Put the API behind HTTPS and a reverse proxy that preserves the exact webhook request body.
- Deploy the web and API on the same HTTPS host or sibling subdomains and set `COOKIE_DOMAIN` to their shared parent domain, for example `.example.com`.

GitHub webhook verification uses the raw UTF-8 body and `X-Hub-Signature-256`. Proxies must not rewrite the body.

## 7. Build and run containers

From the repository root:

```bash
docker build -f apps/api/Dockerfile -t tasks-dash-api:latest .
docker build -f apps/web/Dockerfile -t tasks-dash-web:latest .
```

Run the API with all API secrets and the web application with:

```text
TASKS_DASH_API_BASE_URL=https://api.example.com/api
NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api
```

Health check:

```text
GET https://api.example.com/api/health
```

The endpoint reports `UP` only when MongoDB is connected.

## 8. First production verification

1. Open the web application and sign in with GitHub.
2. Confirm `/api/auth/me` returns the authenticated workspace and no client-selected workspace header is accepted.
3. Create a real project and set its `repositoryFullName`.
4. Install the GitHub App and confirm repository status appears under integrations.
5. Open a PR whose title, body, or branch contains a work item key such as `TD-12`.
6. Confirm the PR is linked to the matching work item. Re-deliver the webhook and confirm the delivery and successful automation action are not duplicated.
7. Connect Discord, create a `PULL_REQUEST_OPENED` automation rule, and open another PR.
8. Connect Google Drive, set the project's `driveRootFolderId`, and load the folder tree.
9. Review `automation_runs` and integration `lastError` fields for failures.
