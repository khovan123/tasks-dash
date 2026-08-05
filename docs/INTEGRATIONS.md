# Integrations

## GitHub

GitHub OAuth authenticates users. The GitHub App supplies installation access, repository selection, webhook signature verification, and PR/commit linking.

## Discord

A workspace Owner/Admin installs one bot and configures Guild ID, optional Category ID, Updates template, and Docs template. Each project receives:

```text
#<project-key>-updates
#<project-key>-docs
```

The Updates channel receives automation messages through an encrypted incoming webhook. The Docs channel receives file attachments through the Bot API. Tasks Dash stores the returned guild/channel/message/attachment IDs and can navigate to the exact Discord message.

No Google OAuth or Google Drive integration is used.
