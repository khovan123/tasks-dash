# Architecture

## Bounded contexts

- Portfolio & Projects
- Work Management (Modules, Work Items, Workflows)
- Planning (Backlog, Sprints, Boards)
- Knowledge (Google Drive-backed project docs)
- Identity & Membership
- Integrations (GitHub, Discord, Google Drive)
- Automation & Jobs
- Reporting

## Backend layering

Each feature can evolve through four boundaries:

1. `domain`: entities, invariants, repository ports
2. `application`: commands, queries, handlers, use cases
3. `infrastructure`: MongoDB persistence and external adapters
4. `presentation`: controllers and webhook entry points

The current MVP applies full CQRS to project creation and work-item creation/status transitions, while read-heavy dashboard services use optimized query services.

## Frontend organization

- `atoms`: primitive reusable UI components
- `molecules`: small composed units such as stat cards and work-item cards
- `organisms`: sidebar, board, dashboard grids, project shell
- `features`: project/dashboard/workflow behavior and schemas
- `app`: routes and server composition

The client API layer parses one shared envelope and keeps domain outcome mapping outside page components.
