# AGENTS.md

Centralised AI agent instructions. Add coding guidelines, style guides, and project context here.

Ruler concatenates all .md files in this directory (and subdirectories), starting with AGENTS.md (if present), then remaining files in sorted order.

## Contract value-set typing

- Do not define TypeScript enums for app/domain value sets. Use `as const` objects and derive types from them.
- Do not define direct string literal unions. Define a constant source first, then derive the type.
- Canonical domain/API values use `SCREAMING_SNAKE_CASE` and live in `packages/contracts`.
- Hardcoded domain, workflow, lifecycle, audit, error, and integration values must be imported from `packages/contracts`.
- Before finishing a TypeScript change, search changed code for direct literal unions and enums.

## API result contract

- JSON success: `{ ok: true, data }`.
- JSON failure: `{ ok: false, problem: { type, status, code, titleKey, detailKey, requiredAction, correlationId, meta } }`.
- The HTTP status must match `problem.status`.
- Use shared response helpers and the global exception filter.

## Web BFF and API client layer

- Keep Next route handlers as BFF/proxy code.
- Centralize upstream URL, session handling, query normalization, envelope parsing, and error forwarding.
- Client calls go through the shared `apiRequest` helper.
- TanStack Query orchestration belongs in `*-queries.ts`.
- Server-only proxy helpers live under `apps/web/src/lib/server`.

## Mock data placement

- Web mock payloads must live under `apps/web/public/assets/mocks`.

## Frontend form architecture

- Non-trivial forms use `react-hook-form` and `zod`.
- Schemas live in sibling `schemas/` folders.
- Prefer `FormProvider`, `useFormContext`, and `Controller` for reusable fields.

## Debugging and bug-fixing protocol

Every bug fix must include:

1. **Root cause** – the exact failing code path or incorrect assumption.
2. **Fix** – what changed, why it resolves the issue, and any trade-offs.

## Project architecture

- `apps/web`: Next.js, Tailwind CSS, shadcn-style components, Atomic Design, feature-based modules.
- `apps/api`: NestJS, CQRS, dependency injection, Clean Architecture, DDD, MongoDB, cron jobs, webhooks, workflow jobs.
- `packages/contracts`: canonical API/domain constants, DTOs, and envelope contracts.
