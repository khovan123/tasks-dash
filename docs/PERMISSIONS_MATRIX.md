# Permissions Matrix

Standardized on August 5, 2026.

## Role Model

- `OWNER`: full workspace access, including destructive workspace lifecycle actions.
- `ADMIN`: workspace administration, but not owner-only lifecycle actions.
- `PROJECT_LEAD`: project configuration and project operations for projects they belong to.
- `MEMBER`: day-to-day project operations for projects they belong to.
- `VIEWER`: read-only access for projects they belong to.

## Access Rules

- Workspace-scoped write routes default to: `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER`.
- `VIEWER` is read-only unless a route explicitly allows it.
- For project-scoped routes:
  - `OWNER` and `ADMIN` can access every project in the workspace.
  - `PROJECT_LEAD`, `MEMBER`, and `VIEWER` must match at least one of:
    - `project.memberIds` contains `session.memberId`
    - `project.leadId === session.memberId`
- Work-item routes without `projectKey` resolve project access through the work item's `projectKey`.

## Endpoint Matrix

### Auth / Workspaces

| Endpoint | Method | Allowed roles | Membership rule |
| --- | --- | --- | --- |
| `/auth/me` | `GET` | authenticated workspace member | workspace only |
| `/auth/refresh` | `POST` | authenticated workspace member | workspace only |
| `/auth/logout` | `POST` | authenticated workspace member | workspace only |
| `/workspaces` | `GET` | authenticated identity | membership list by identity |
| `/workspaces` | `POST` | authenticated identity | creates new workspace as `OWNER` |
| `/workspaces/setup` | `POST` | public setup token | n/a |
| `/workspaces/:workspaceId` | `PATCH` | `OWNER` only | enforced by service |
| `/workspaces/:workspaceId` | `DELETE` | `OWNER` only | enforced by service |
| `/workspaces/:workspaceId/switch` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER`, `VIEWER` | workspace membership required |

### Workspace Members

| Endpoint | Method | Allowed roles | Membership rule |
| --- | --- | --- | --- |
| `/workspace/members` | `GET` | authenticated workspace member | workspace only |
| `/workspace/invitations` | `POST` | `OWNER`, `ADMIN` | workspace only |
| `/workspace/invitations/:invitationId/resend` | `POST` | `OWNER`, `ADMIN` | workspace only |
| `/workspace/invitations/:invitationId` | `DELETE` | `OWNER`, `ADMIN` | workspace only |
| `/workspace/members/:memberId/role` | `PATCH` | `OWNER`, `ADMIN` | workspace only |
| `/workspace/members/:memberId` | `DELETE` | `OWNER`, `ADMIN` | workspace only |

### Projects

| Endpoint | Method | Allowed roles | Membership rule |
| --- | --- | --- | --- |
| `/projects` | `GET` | authenticated workspace member | `OWNER`/`ADMIN` see all, others only assigned/led projects |
| `/projects` | `POST` | `OWNER`, `ADMIN` | workspace only |
| `/projects/:key` | `GET` | authenticated workspace member | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:key/members` | `GET` | authenticated workspace member | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:key` | `PATCH` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:key` | `DELETE` | `OWNER`, `ADMIN` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:key/members` | `PATCH` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |

### Workflows and Sprints

| Endpoint | Method | Allowed roles | Membership rule |
| --- | --- | --- | --- |
| `/projects/:projectKey/workflow` | `GET` | authenticated workspace member | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/workflow` | `PUT` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/sprints` | `GET` | authenticated workspace member | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/sprints` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |

### Work Items

| Endpoint | Method | Allowed roles | Membership rule |
| --- | --- | --- | --- |
| `/projects/:projectKey/work-items` | `GET` | authenticated workspace member | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/work-items` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/work-items/reorder` | `PATCH` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/work-items/:key/status` | `PATCH` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | resolved through work item project |
| `/work-items/:key` | `PATCH` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | resolved through work item project |

### Documents

| Endpoint | Method | Allowed roles | Membership rule |
| --- | --- | --- | --- |
| `/projects/:projectKey/documents` | `GET` | authenticated workspace member | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/documents/folders` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/documents/folders/:folderId` | `PATCH` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/documents/folders/:folderId` | `DELETE` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/documents/upload` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/documents/:documentId/versions` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/documents/:documentId` | `PATCH` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/documents/:documentId` | `DELETE` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/documents/:documentId/download` | `GET` | authenticated workspace member | project membership required unless `OWNER`/`ADMIN` |

### Designer Catalog

| Endpoint | Method | Allowed roles | Membership rule |
| --- | --- | --- | --- |
| `/projects/:projectKey/design-catalog` | `GET` | authenticated workspace member | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/design-catalog` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/design-catalog/:itemId` | `PATCH` | `OWNER`, `ADMIN`, `PROJECT_LEAD`, `MEMBER` | project membership required unless `OWNER`/`ADMIN` |
| `/projects/:projectKey/design-catalog/:itemId` | `DELETE` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |

### Integrations

| Endpoint | Method | Allowed roles | Membership rule |
| --- | --- | --- | --- |
| `/integrations/github/status` | `GET` | authenticated workspace member | workspace only |
| `/integrations/github/install` | `GET` | `OWNER`, `ADMIN` | workspace only |
| `/integrations/github/setup` | `GET` | `OWNER`, `ADMIN` | workspace only |
| `/integrations/github/repositories` | `GET` | authenticated workspace member | workspace only |
| `/integrations/github/projects/:projectKey/repository` | `PATCH` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |
| `/integrations/github/projects/:projectKey/repository` | `DELETE` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |
| `/integrations/discord/workspace/status` | `GET` | authenticated workspace member | workspace only |
| `/integrations/discord/install` | `GET` | `OWNER`, `ADMIN` | workspace only |
| `/integrations/discord/setup` | `GET` | `OWNER`, `ADMIN` | workspace only |
| `/integrations/discord/workspace/configure` | `POST` | `OWNER`, `ADMIN` | workspace only |
| `/integrations/discord/workspace/provision-all` | `POST` | `OWNER`, `ADMIN` | workspace only |
| `/integrations/discord/workspace/channels` | `DELETE` | `OWNER`, `ADMIN` | workspace only |
| `/integrations/discord/status` | `GET` | authenticated workspace member | workspace only |
| `/integrations/discord/connect` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | workspace only |
| `/integrations/discord/projects/:projectKey/provision` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |
| `/integrations/discord/projects/:projectKey` | `DELETE` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |
| `/integrations/discord/projects/:projectKey/channels` | `GET` | authenticated workspace member | project membership required unless `OWNER`/`ADMIN` |
| `/integrations/discord/projects/:projectKey/test` | `POST` | `OWNER`, `ADMIN`, `PROJECT_LEAD` | project membership required unless `OWNER`/`ADMIN` |

## Notes

- This matrix reflects current API enforcement, not just intended UI behavior.
- Workspace membership and project membership are separate checks.
- Project membership is enforced in the request guard for project-scoped resources and work-item scoped resources.
