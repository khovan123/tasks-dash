FROM node:22.23.1-alpine AS build
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/web apps/web
RUN npm run build -w @tasks-dash/contracts && npm run build -w @tasks-dash/web

FROM node:22.23.1-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S nodejs && adduser -S tasksdash -G nodejs
COPY --from=build --chown=tasksdash:nodejs /app/apps/web/.next/standalone ./
COPY --from=build --chown=tasksdash:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=tasksdash:nodejs /app/apps/web/public ./apps/web/public
USER tasksdash
EXPOSE 8080
CMD ["node", "apps/web/server.js"]
