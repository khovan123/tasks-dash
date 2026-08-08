# Fogewise — Project Onboarding Guide

Tài liệu này dành cho developer khi đưa một repository mới lên Fogewise.

## Mục tiêu

Sau khi onboarding xong, flow production sẽ là:

```text
push main
   ↓
GitHub Actions
   ↓
build Docker image
   ↓
push GHCR
   ↓
VPS docker pull
   ↓
docker compose up
   ↓
Caddy
   ↓
https://<repo>.fogewise.io.vn
```

VPS **không clone/pull source code và không build application**.

Runtime directory trên VPS chỉ giữ:

```text
/srv/apps/<repo>/
├── .env
└── .fogewise/
    └── deploy.yml
```

---

# Quick onboarding

Một project mới chỉ cần 6 bước:

1. Thêm `Dockerfile` cho từng service.
2. Thêm `.fogewise/deploy.yml`.
3. Thêm caller workflow ngắn cho GitHub Actions.
4. Set 4 repository secrets.
5. Tạo `/srv/apps/<repo>/.env` trên VPS.
6. Push vào `main`.

---

# 1. Thêm Dockerfile

Mỗi HTTP service được Fogewise deploy phải chạy bên trong container ở port:

```text
8080
```

Application phải thực sự listen trên:

```text
0.0.0.0:8080
```

`EXPOSE 8080` chỉ là metadata Docker; application vẫn phải được cấu hình để listen port `8080`.

Ví dụ Node.js:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

EXPOSE 8080
CMD ["node", "dist/main.js"]
```

## Dockerfile rules

- Không copy production `.env` vào image.
- Không hardcode secret trong Dockerfile.
- Không phụ thuộc source code tồn tại trên VPS.
- Runtime image phải chứa đầy đủ file/static assets cần thiết khi chạy.
- Fogewise build image trên GitHub Actions, không build trên VPS.

---

# 2. Thêm `.fogewise/deploy.yml`

Fogewise chỉ cần biết topology của project.

## Monolith

```yaml
services:
  app:
    path: .
    route: /
```

## Monolith dùng Redis

```yaml
services:
  app:
    path: .
    route: /
    requires:
      - redis
```

## Monorepo

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

## Ý nghĩa field

### `services`

Danh sách service cần deploy.

Tên service như `api`, `web`, `app` cũng là Docker internal DNS name.

Ví dụ service khác có thể gọi API qua:

```text
http://api:8080
```

### `path`

Đường dẫn từ repository root tới service.

Fogewise CI sẽ tìm Dockerfile tại:

```text
<path>/Dockerfile
```

Build context vẫn là repository root.

### `route`

Public HTTP route của service.

Ví dụ:

```text
/api → api service
/    → web service
```

Chỉ một service được sở hữu `/`.

### `requires`

Khai báo infrastructure dependency do Fogewise cung cấp.

Ví dụ:

```yaml
requires:
  - redis
```

`requires` chỉ attach network cần thiết. URI, username, password và các runtime config khác vẫn nằm trong `.env`.

## Không thêm các field sau

Không đưa application config vào manifest:

```text
port
hostPort
portEnv
env
buildEnv
runtimeEnv
internalApiUrl
upstreams
credentials
image
```

Fogewise HTTP convention luôn dùng container port `8080`.

---

# 3. Thêm caller workflow

Tạo:

```text
.github/workflows/deploy.yml
```

Caller workflow chỉ có nhiệm vụ gọi reusable workflow chuẩn của Fogewise.

Template:

```yaml
name: Deploy Production

on:
  push:
    branches:
      - main

permissions:
  contents: read
  packages: write

jobs:
  deploy:
    uses: <FOGEWISE_SHARED_WORKFLOW>
    secrets:
      VPS_HOST: ${{ secrets.VPS_HOST }}
      VPS_USER: ${{ secrets.VPS_USER }}
      VPS_SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
      VPS_KNOWN_HOSTS: ${{ secrets.VPS_KNOWN_HOSTS }}
```

`<FOGEWISE_SHARED_WORKFLOW>` phải dùng reusable workflow chuẩn do Fogewise platform team cung cấp.

Không copy logic `docker build`, GHCR login, SSH, Caddy hoặc `docker compose` vào từng project nếu project đã sử dụng reusable workflow chung.

---

# 4. Set repository secrets

Vào:

```text
GitHub Repository
→ Settings
→ Secrets and variables
→ Actions
```

Tạo đúng 4 secrets:

```text
VPS_HOST
VPS_USER
VPS_SSH_KEY
VPS_KNOWN_HOSTS
```

## Không cần tạo `GITHUB_TOKEN`

GitHub Actions tự cấp `GITHUB_TOKEN` cho workflow run.

Fogewise dùng token này để:

```text
build image
→ push GHCR
→ cấp quyền GHCR tạm thời cho VPS
→ docker pull
→ xóa credential tạm sau deploy
```

Không lưu GHCR PAT lâu dài trong application `.env`.

---

# 5. Tạo production `.env` trên VPS

Production environment nằm tại:

```text
/srv/apps/<repo>/.env
```

Ví dụ:

```bash
REPO="my-project"

install -d \
  -o root \
  -g root \
  -m 700 \
  "/srv/apps/$REPO"

nano "/srv/apps/$REPO/.env"

chown root:root "/srv/apps/$REPO/.env"
chmod 600 "/srv/apps/$REPO/.env"
```

Fogewise sẽ tự attach file này vào các service dưới dạng Docker `env_file`.

## Port application

Application phải được cấu hình để listen `8080`.

Ví dụ:

```env
PORT=8080
```

Nếu backend sử dụng variable khác:

```env
API_PORT=8080
```

Nếu service trong cùng project gọi nhau, dùng service ID trong manifest làm hostname.

Ví dụ:

```env
INTERNAL_API_BASE_URL=http://api:8080/api
```

Không dùng `localhost` để gọi container khác.

---

# 6. Push `main`

Sau khi đủ Dockerfile, manifest, workflow, secrets và production env:

```bash
git add .
git commit -m "chore: configure Fogewise deployment"
git push origin main
```

GitHub Actions sẽ tự chạy:

```text
checkout
  ↓
read .fogewise/deploy.yml
  ↓
build image từng service
  ↓
push ghcr.io/<owner>/<repo>-<service>:<git-sha>
  ↓
upload deploy.yml
  ↓
normalize VPS permissions
  ↓
VPS docker compose pull
  ↓
docker compose up -d
  ↓
resolve dynamic localhost ports
  ↓
generate/reload Caddy
  ↓
health check
```

Production luôn deploy bằng immutable Git SHA tag, không phụ thuộc `latest`.

---

# VPS runtime contract

Fogewise tự normalize ownership và permission sau mỗi deployment:

```text
/srv/apps/<repo>                       root:root 0700
/srv/apps/<repo>/.env                  root:root 0600
/srv/apps/<repo>/.fogewise             root:root 0755
/srv/apps/<repo>/.fogewise/deploy.yml  root:root 0644
```

Developer không cần chạy `chown/chmod` thủ công sau mỗi deployment.

Source code không được giữ trong `/srv/apps/<repo>`.

Fogewise tự cleanup các source/file legacy và chỉ giữ:

```text
.env
.fogewise/deploy.yml
```

---

# Domain convention

Domain production được Fogewise derive từ repository name:

```text
https://<repo>.fogewise.io.vn
```

Ví dụ repository:

```text
tasks-dash
```

sẽ có domain:

```text
https://tasks-dash.fogewise.io.vn
```

Không cần khai báo domain trong `.fogewise/deploy.yml`.

---

# Checklist trước khi push main

- [ ] Mỗi service có Dockerfile.
- [ ] Application listen `0.0.0.0:8080`.
- [ ] Có `.fogewise/deploy.yml`.
- [ ] Route không bị trùng.
- [ ] Chỉ có tối đa một service dùng route `/`.
- [ ] Có `.github/workflows/deploy.yml` caller.
- [ ] Đã set `VPS_HOST`.
- [ ] Đã set `VPS_USER`.
- [ ] Đã set `VPS_SSH_KEY`.
- [ ] Đã set `VPS_KNOWN_HOSTS`.
- [ ] Đã tạo `/srv/apps/<repo>/.env` trên VPS.
- [ ] Production `.env` không nằm trong Git repository.
- [ ] Không có secret trong Docker image/build arguments.

---

# Những thứ developer không cần làm

Không cần:

```text
SSH vào VPS để git pull
clone source lên VPS
npm install trên VPS
npm run build trên VPS
docker build trên VPS
viết docker-compose production riêng
chọn host port
config Caddy thủ công
login GHCR cố định trên VPS
chown/chmod sau mỗi deploy
```

Fogewise platform chịu trách nhiệm cho các phần này.

---

# Tóm tắt

```text
Developer
   │
   ├── Dockerfile
   ├── .fogewise/deploy.yml
   ├── caller workflow
   ├── 4 repository secrets
   └── production .env trên VPS
            │
            ▼
        push main
            │
            ▼
      Fogewise deploy
            │
      ┌─────┴─────┐
      ▼           ▼
     GHCR         VPS
   build/push   pull/run
                   │
                   ▼
                 Caddy
                   │
                   ▼
      https://<repo>.fogewise.io.vn
```
