# GridSense API. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t gridsense-api .

FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# The schema must be present for the postinstall `prisma generate`.
COPY apps/api/prisma apps/api/prisma
RUN npm ci --workspace @gridsense/api --include-workspace-root=false --no-audit --no-fund
COPY apps/api apps/api
WORKDIR /repo/apps/api
RUN npm run build

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl tini
ENV NODE_ENV=production
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/api/prisma apps/api/prisma
RUN npm ci --workspace @gridsense/api --include-workspace-root=false --omit=dev --no-audit --no-fund \
 && npm cache clean --force
WORKDIR /repo/apps/api
COPY --from=build /repo/apps/api/dist ./dist

USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
# Apply migrations, create the first admin if ADMIN_* is set, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/prisma/seed.js && node dist/src/main"]
