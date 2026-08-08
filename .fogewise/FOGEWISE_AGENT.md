# FOGEWISE_AGENT.md

Project-specific deployment rules for Fogewise production. These rules apply to Dockerfiles, runtime environment, HTTP routing, infrastructure dependencies, Caddy, and GitHub Actions deployment.

## Deployment source of truth

- `.fogewise/deploy.yml` is the single source of truth for Fogewise deployment topology.
- Do not declare Fogewise deployment metadata in `package.json`.
- Do not add repository-owned production Compose files. Fogewise generates Compose outside the synced repository.
- Application/package metadata may still be inspected from a service path when useful, but package names must not be duplicated into the Fogewise manifest.
- Application runtime configuration stays in environment variables and application code, not in the Fogewise manifest.

## Deploy manifest contract

Fogewise currently deploys HTTP services. The manifest intentionally stays small:

```yaml
services:
  <service-id>:
    path: <repo-relative-path>
    route: <public-route>
    requires:
      - <optional-platform-dependency>
```

Fields:

- `services`: deployable services in this repository.
- service key such as `app`, `api`, or `web`: stable logical service identity inside this deployment.
- `path`: repository-relative directory containing that service's `Dockerfile`; `.` means repository root.
- `route`: public HTTP route handled by the service, such as `/` or `/api`.
- `requires`: optional platform infrastructure dependencies such as `redis`.

Do not add fields for application runtime variables, package names, container ports, host ports, build arguments, internal URLs, or env-file toggles.

### Monolith

```yaml
services:
  app:
    path: .
    route: /
```

### Monolith with Redis

```yaml
services:
  app:
    path: .
    route: /
    requires:
      - redis
```

### Monorepo

```yaml
services:
  api:
    path: apps/api
    route: /api
    requires:
      - redis

  web:
    path: apps/web
    route: /
```

For this repository, `.fogewise/deploy.yml` uses the monorepo form above.

## Platform conventions

Fogewise owns deployment topology through conventions rather than per-project metadata:

- Every HTTP service uses container port `8080`.
- The application is responsible for listening on `8080` through its own environment/configuration mechanism; Fogewise does not invent or inject variable names such as `PORT`, `API_PORT`, or `SERVER_PORT`.
- Host ports are loopback-only and dynamically allocated as `127.0.0.1::<8080>`.
- The repository runtime env file is `/etc/fogewise/apps/<repo>.env`.
- The runtime env file is automatically attached to every declared service when present; there is no per-service `env: true` flag.
- Fogewise does not generate application variables such as `INTERNAL_API_BASE_URL`, `NEXT_PUBLIC_*`, database URLs, credentials, OAuth values, SMTP settings, or other runtime/build configuration.
- Services in the same deployment share the generated application network. Manifest service IDs are the stable internal DNS identities, so application-owned env may reference addresses such as `http://api:8080/api` when appropriate.
- `requires` attaches the service to the required platform infrastructure network(s). Dependency credentials and connection URIs remain application-owned env values.
- Build context for each service is the repository root; the Dockerfile is resolved from `<repo>/<path>/Dockerfile`. This keeps monorepo services able to copy shared packages from the repository root.

## Generated deployment topology

Production deployment is owned by `/usr/local/sbin/fogewise-deploy <repo-name>`.

Expected flow:

```text
/srv/apps/<repo>/.fogewise/deploy.yml
        -> parse services
        -> validate service paths/routes/dependencies
        -> resolve <path>/Dockerfile
        -> generate /var/lib/fogewise/apps/<repo>/compose.json
        -> automatically attach /etc/fogewise/apps/<repo>.env when present
        -> publish each service as 127.0.0.1::<8080>
        -> docker compose up -d --build --remove-orphans
        -> inspect dynamically allocated loopback host ports
        -> generate /etc/caddy/conf.d/<repo>.caddy
        -> validate and reload Caddy
```

Rules:

- Service IDs must be safe, unique YAML keys and must not depend on folder names such as `frontend` or `backend`.
- `path` must stay inside the repository and must resolve to a directory with a Dockerfile.
- Public routes must start with `/` and must be unique within a deployment.
- Only one service may own `/`.
- More-specific routes must be handled before `/` when Fogewise renders Caddy.
- Never publish application ports on `0.0.0.0` unless there is an explicit infrastructure decision to do so.
- The platform-level Caddyfile must retain `import /etc/caddy/conf.d/*.caddy`.
- Generated Caddy site files must live in `/etc/caddy/conf.d`, be mode `0644`, and not depend on the caller's shell umask.

## Runtime environment and secrets

- Production secrets live only in `/etc/fogewise/apps/<repo>.env` on the VPS or another explicitly approved secret store.
- Never commit production secrets or copy `.env` files into Docker images.
- Fogewise automatically supplies the repository runtime env file to declared services; applications decide which variables they consume.
- Runtime variable names and values are application concerns. Do not add them to `.fogewise/deploy.yml` merely to make deployment work.
- Cross-service URLs are also application concerns. If a service needs another service, configure the URL in env using the manifest service ID and port `8080`.
- Shared infrastructure URIs and credentials remain env values. `requires` only declares the topology dependency.

For this repository, production must configure the API and web processes to listen on `8080` using the variables those applications already support. Fogewise itself must not special-case those variable names.

## Infrastructure dependencies

- Declare platform dependencies only with `requires` in `.fogewise/deploy.yml`.
- For Redis, `requires: [redis]` attaches the service to the shared Fogewise infrastructure network.
- Application runtime must use the platform Redis hostname/URI supplied through env, never `127.0.0.1` from another container.
- `localhost` inside a container always means that same container.
- If a new dependency such as RabbitMQ is needed, extend the platform dependency registry and then add its key to `requires`; do not add infrastructure containers to the repository.

## Public/static assets in multi-stage images

Production runtime images must include every non-compiled file required at runtime.

For this repository:

- Next.js standalone runtime must contain `apps/web/public` in addition to `.next/standalone` and `.next/static`.
- NestJS runtime must contain `apps/api/public` because `main.ts` serves it through `useStaticAssets` under `/public/`.
- Do not assume build-stage files exist in the runtime stage; multi-stage images must explicitly copy required runtime assets.
- HTTP Dockerfiles should expose `8080` to match the Fogewise service contract.

## CI and deployment log secrecy

- Generated Compose configuration may contain resolved environment values and must be treated as secret-bearing.
- Never stream resolved Compose configuration to GitHub Actions or another shared CI log.
- Validate Compose with `docker compose ... config --quiet >/dev/null`.
- Never print `/etc/fogewise/apps/<repo>.env`, `env`, `printenv`, resolved container environment, or `docker inspect` environment fields into CI logs.
- Do not enable shell xtrace around commands that can expand secrets or connection strings.
- GitHub masking cannot protect VPS-only values that GitHub never received as Actions secrets.
- Keep raw deploy stdout/stderr in a root-only server log when necessary and print only safe status summaries to CI.
- Server-side deploy logs that may contain sensitive diagnostics must be explicitly mode `0600` and must never be uploaded as CI artifacts.
- Do not wrap the whole deploy process in `umask 077`; restrict the log file itself and let the deployer create service-readable runtime files.

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

For service-specific inspection, use service IDs from `.fogewise/deploy.yml` and generated Compose rather than guessed container names.

For this project, important production checks include:

- both `api` and `web` processes listen on container port `8080`;
- `/api/auth/me` is reachable through public route `/api`;
- `/logo.png`, `/favicon.ico`, and web `/assets/*` files are present in the web runtime image;
- API `/public/*` assets are present in the API runtime image;
- Redis resolves inside `api` because it declares `requires: [redis]`;
- application-owned internal API configuration points to the generated `api` service DNS when server-to-server access is needed.

## Change discipline

- Do not reintroduce `package.json.fogewise`, `.fogewise` fields for ports/env/upstreams/build args, `compose.prod.yml`, fixed host ports, or the obsolete `/etc/caddy/sites-enabled` convention.
- Keep `.fogewise/deploy.yml` limited to deployment intent: service path, route, and platform dependencies.
- If the Fogewise manifest schema or platform conventions change, update this file in the same PR.
- If a Dockerfile change affects runtime files, verify the final runtime stage rather than only the build stage.
- Any deployment bug fix must document the exact failing layer: manifest, image build, container runtime, Docker network, generated Compose, Caddy, or Cloudflare.
