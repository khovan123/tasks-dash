# FOGEWISE_AGENT.md

Project-specific deployment rules for Fogewise production. These rules apply to any change involving Dockerfiles, runtime environment variables, HTTP routes, infrastructure dependencies, public assets, Caddy routing, or GitHub Actions deployment.

## Deployment source of truth

- `package.json` workspace metadata is the application deployment source of truth.
- Discover deployable services from the root `workspaces` declaration; do not assume folders named `api`, `web`, `frontend`, or `backend`.
- A workspace is deployable only when its `package.json` contains a `fogewise` object.
- Do not add repository-owned production Compose files. Fogewise generates production Compose outside the synced repository.
- Do not use `.fogewise/deploy.yml` or any other manifest that duplicates route/port/service topology.

## Fogewise workspace metadata contract

Supported application intent is declared under each deployable workspace's `fogewise` object:

- `type`: service type, currently `http` for HTTP workloads.
- `route`: public route handled by the service, such as `/` or `/api`.
- `port`: container/process port.
- `portEnv`: optional environment variable Fogewise injects with `port` (for example `PORT` or `API_PORT`).
- `priority`: route ordering; more specific services should have higher priority than `/` fallback services.
- `env`: when `true`, inject `/etc/fogewise/apps/<repo>.env` into that service at runtime.
- `requires`: platform infrastructure dependencies such as `redis`.
- `upstreams`: package-to-package dependencies. Each upstream must reference another deployable workspace by package name, never by a guessed Docker service name.
  - `package`: target workspace package name.
  - `env`: runtime internal URL variable generated from target service DNS, port, and route.
  - `buildEnv`: optional build-time public route variable generated from target route.

Example relationship:

```text
@tasks-dash/web
  -> INTERNAL_API_BASE_URL
  -> @tasks-dash/api

browser
  -> NEXT_PUBLIC_API_BASE_URL=/api
  -> Caddy
  -> @tasks-dash/api
```

## Generated deployment topology

Production deployment is owned by `/usr/local/sbin/fogewise-deploy <repo-name>`.

Expected flow:

```text
/srv/apps/<repo>/package.json
        -> discover workspaces
        -> read fogewise metadata
        -> locate workspace Dockerfiles
        -> generate /var/lib/fogewise/apps/<repo>/compose.json
        -> docker compose up -d --build --remove-orphans
        -> inspect dynamically allocated loopback host ports
        -> generate /etc/caddy/conf.d/<repo>.caddy
        -> validate and reload Caddy
```

Rules:

- Docker build context for a monorepo service is the repository root unless metadata explicitly evolves to support another safe context.
- Generated Docker service names come from package identity. Application code must not depend on generated service/container names.
- Host ports must be loopback-only and dynamically allocated; do not hardcode host ports such as `3100` or `4100`.
- Never publish application ports on `0.0.0.0` unless there is an explicit infrastructure decision to do so.
- Caddy routes must be generated from declared workspace routes and resolved host ports, with more-specific routes handled before `/`.
- The platform-level Caddyfile must retain `import /etc/caddy/conf.d/*.caddy`; app deploy code manages only per-app site files in `/etc/caddy/conf.d`.
- Generated Caddy site files must be service-readable (mode `0644`); deployment behavior must not depend on the caller's shell umask.

## Runtime environment and secrets

- Production secrets live in `/etc/fogewise/apps/<repo>.env` on the VPS.
- Never commit production secrets or copy `.env` into Docker images.
- Only workspaces with `fogewise.env: true` receive the repository runtime env file.
- Deployment-derived values such as process ports, internal upstream URLs, public upstream routes, Docker service names, and dynamic host ports must not be duplicated in the secret env file when Fogewise can derive them from metadata.
- `NODE_ENV=production` is a runtime application setting, not deployment topology.

## CI and deployment log secrecy

- Treat generated Compose configuration as secret-bearing whenever any service receives an `env_file`.
- Never stream resolved Compose configuration to GitHub Actions or another shared CI log.
- Never run `docker compose ... config` in a streamed CI/SSH session when it may render secret environment values. For validation use `docker compose ... config --quiet >/dev/null`.
- Never log or print `/etc/fogewise/apps/<repo>.env`, `env`, `printenv`, resolved container environment, `docker inspect` environment fields, or other secret-bearing runtime configuration.
- Do not enable shell xtrace (`set -x`) around commands that can expand secrets, credentials, private keys, connection strings, or environment files.
- GitHub Actions secret masking is not a protection for values that exist only on the VPS; GitHub cannot mask secrets it was never given as Actions secrets.
- `/usr/local/sbin/fogewise-deploy` must produce only explicitly safe status output when its stdout/stderr is streamed to CI. Validation commands that can reveal secrets must be quiet or redirected.
- As defense in depth, the repository deploy workflow must not stream raw platform deploy output unless the platform deployer is verified secret-safe. Capture raw deploy output in a root-only VPS log and print only a safe success/failure summary plus non-secret service status.
- Server-side deploy logs that may temporarily contain sensitive diagnostics must be created explicitly with mode `0600` and must not be copied into CI artifacts.
- Do not wrap the whole deploy process in `umask 077`; the deployer creates service-readable runtime files such as Caddy site configs. Restrict only the log file itself and run the deployer with a normal `022` umask.
- Failure output sent to CI should reference the server-side log path instead of echoing secret-bearing diagnostics.

## Infrastructure dependencies

- Declare infrastructure dependencies through `fogewise.requires`; do not hardcode shared infrastructure container topology into repository Compose files.
- For Redis, application runtime must connect through the shared Docker network using the infrastructure hostname (currently `fogewise-redis`), never `127.0.0.1` from another container.
- `localhost` inside a container always means that same container.
- If a new shared dependency such as RabbitMQ becomes required by application code, first extend the Fogewise dependency mapping and then declare it in `requires`.

## Public/static assets in multi-stage images

Production runtime images must include every non-compiled file required at runtime.

For this repository:

- Next.js standalone runtime must contain `apps/web/public` in addition to `.next/standalone` and `.next/static`.
- NestJS runtime must contain `apps/api/public` because `main.ts` serves it through `useStaticAssets` under `/public/`.
- Do not assume a build-stage `COPY apps/<workspace> apps/<workspace>` makes `public` available in the runtime stage; multi-stage images must explicitly copy required runtime assets.
- When adding new runtime asset directories, verify they are copied into the final image and test the public HTTP URL after deployment.

## Deployment verification

After a deployment-related change, verify at minimum:

```bash
/usr/local/sbin/fogewise-deploy <repo>

docker compose \
  -p <repo> \
  -f /var/lib/fogewise/apps/<repo>/compose.json \
  ps

cat /etc/caddy/conf.d/<repo>.caddy
curl -I https://<repo>.fogewise.io.vn
```

For service-specific inspection, use Compose service names from generated `compose.json`, not guessed container names:

```bash
docker compose \
  -p <repo> \
  -f /var/lib/fogewise/apps/<repo>/compose.json \
  exec <service> <command>
```

For this project, important production checks include:

- `/api/auth/me` should be reachable through the public `/api` route and should not fail because of Redis connectivity.
- `/logo.png`, `/favicon.ico`, and web `/assets/*` files must be present in the web runtime image.
- API `/public/*` assets must be present in the API runtime image.
- Redis hostname must resolve inside the API service when Redis is declared in `requires`.

## Change discipline

- Do not reintroduce `compose.prod.yml`, hardcoded frontend/backend service names, hardcoded public route topology, fixed host ports, or the obsolete `/etc/caddy/sites-enabled` convention.
- If the Fogewise metadata schema or platform Caddy layout changes, update this file in the same PR.
- If a Dockerfile change affects runtime files, verify the final runtime stage rather than only the build stage.
- Any deployment bug fix must document the exact failing layer: source, image build, container runtime, Docker network, generated Compose, Caddy, or Cloudflare.
