# Data model

All business collections include `workspaceId` for tenant isolation.

## Project

Key fields include `key`, `name`, `repositoryFullName`, `discordGuildId`, `discordUpdatesChannelId`, and `discordDocsChannelId`.

## Documents

- `document_folders`: virtual tree through `parentFolderId`.
- `documents`: name, folder, description, tags, current version, creators/editors.
- `document_versions`: file metadata plus Discord guild/channel/message/attachment IDs.

A document version is unique by `(workspaceId, documentId, version)`. A Discord message mapping is unique by `(workspaceId, discordChannelId, discordMessageId)`.
