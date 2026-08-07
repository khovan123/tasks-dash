FROM node:22.23.1-alpine AS build
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm install --no-audit --no-fund
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN npm run build -w @tasks-dash/contracts && npm run build -w @tasks-dash/api

FROM node:22.23.1-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S nodejs && adduser -S tasksdash -G nodejs
COPY --from=build --chown=tasksdash:nodejs /app/package.json ./package.json
COPY --from=build --chown=tasksdash:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=tasksdash:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=build --chown=tasksdash:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=tasksdash:nodejs /app/apps/api/public ./apps/api/public
COPY --from=build --chown=tasksdash:nodejs /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=tasksdash:nodejs /app/packages/contracts/dist ./packages/contracts/dist
USER tasksdash
EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
