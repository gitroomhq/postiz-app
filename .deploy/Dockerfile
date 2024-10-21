FROM docker.io/node:${NODE_VERSION}-alpine3.19 AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ pkgconfig cairo-dev pango-dev

COPY package*.json ./
COPY nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libraries ./libraries

RUN npm ci
RUN npx nx run-many --target=build --projects=frontend,backend,workers,cron --parallel=4

FROM docker.io/node:${NODE_VERSION}-alpine3.19 AS production

WORKDIR /app

RUN apk add --no-cache \
    bash \
    supervisor \
    curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

COPY .deploy/entrypoint.sh /app/entrypoint.sh
COPY .deploy/worker-entrypoint.sh /etc/supervisord.conf
COPY .deploy/healthcheck.sh /app/healthcheck.sh

RUN chmod +x /app/entrypoint.sh /app/healthcheck.sh

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD [ "/app/healthcheck.sh" ]