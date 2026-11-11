# GridSense web dashboard. Build from the repository root:
#   docker build -f apps/web/Dockerfile -t gridsense-web .
#
# NEXT_PUBLIC_* values are compiled into the bundle. Leave them empty to use
# the same origin (/api and /mqtt behind the reverse proxy in docker-compose).

FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @gridsense/web --include-workspace-root=false --no-audit --no-fund
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_MQTT_BROKER=""
ARG NEXT_PUBLIC_MQTT_BROKER_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_MQTT_BROKER=$NEXT_PUBLIC_MQTT_BROKER \
    NEXT_PUBLIC_MQTT_BROKER_URL=$NEXT_PUBLIC_MQTT_BROKER_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @gridsense/web

FROM node:22-alpine AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
