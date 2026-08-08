# Web component architecture

The web app follows Atomic Design for presentation and keeps feature/data concerns outside the component hierarchy.

## Dependency direction

```text
components/ui (shadcn primitives)
        ↓
components/atoms
        ↓
components/molecules
        ↓
components/organisms
        ↓
components/templates
        ↓
app/**/page.tsx
```

Feature logic lives beside the domain instead of inside presentation layers:

```text
features/<domain>/types.ts
features/<domain>/lib/*
features/<domain>/hooks/*
features/<domain>/server/*
```

## Layer responsibilities

### `ui/`
Third-party/source-owned shadcn primitives. Do not put domain behavior here.

### `atoms/`
Small domain-aware visual primitives with minimal composition, for example project/workspace logos, priority icons and work-item type icons.

Atoms may depend on `ui/` and utilities. They must not depend on molecules, organisms or templates.

### `molecules/`
Small reusable combinations of atoms/UI primitives, for example member identity, status badges, due indicators and KPI cards.

Molecules may depend on atoms and `ui/`, but not organisms/templates.

### `organisms/`
Feature-level UI sections and interactive containers, for example Kanban Board, Backlog, Project Overview, member managers and integration forms.

Business fetching/normalization that can be shared between pages should live under `features/`; organisms consume those hooks/types instead of duplicating them.

### `templates/`
Page-level layout composition without domain fetching. Templates arrange organisms/children and own page structure only.

### `app/`
Next.js route files should be thin. A page may resolve route params, call a shared `features/**/server` loader and compose templates/organisms. Avoid declaring repeated API response models, permission lookup logic or large presentation trees inside a page.

## Compatibility facades

Some files directly under `components/` currently re-export their canonical Atomic implementation, for example:

```ts
export * from "@/components/organisms/kanban-board";
```

These facades exist only to make migration incremental. New code should import the canonical Atomic path directly. Do not add new implementation logic to a facade.

## Shared state and realtime

Realtime transport/store code is not an Atomic layer. Keep it in providers/store/features and expose focused hooks to organisms. Components should subscribe only to the slice they render.

## Review checklist

Before adding a component:

1. Check whether an existing atom/molecule/organism already represents the pattern.
2. Keep API loading and response shaping in `features/**/server` when reused by pages.
3. Keep reusable client state synchronization in `features/**/hooks`.
4. Do not duplicate domain interfaces in multiple pages/components; put them in `features/<domain>/types.ts`.
5. Do not import upward between Atomic layers.
6. New route files should compose rather than implement feature UI inline.
