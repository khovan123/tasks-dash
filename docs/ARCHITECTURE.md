# Architecture

Tasks Dash uses GitHub OAuth as the only end-user OAuth provider. A GitHub App handles repository installation tokens and signed webhooks. Discord Bot handles project channel provisioning, notifications, and document attachments.

```text
Next.js Web
  → authenticated BFF
NestJS API
  ├── GitHub OAuth identity and multi-workspace session
  ├── GitHub App installations/webhooks
  ├── Discord Updates + Docs channels
  ├── MongoDB document folders/metadata/versions
  └── SMTP invitations
MongoDB
Discord API
GitHub API
```

Document folders are virtual. MongoDB is authoritative for structure, metadata, permissions, and version numbers. Discord is authoritative only for attachment bytes and message identity.
