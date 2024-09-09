# Base image
FROM docker.io/node:20.17-alpine3.19 AS base

## Just reduce unccessary noise in the logs.
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache \
	bash=5.2.21-r0 \
	supervisor=4.2.5-r4 \
	make \
	build-base

WORKDIR /app

EXPOSE 4200
EXPOSE 3000

COPY var/docker/entrypoint.sh /app/entrypoint.sh
COPY var/docker/supervisord.conf /etc/supervisord.conf
COPY var/docker/supervisord /app/supervisord_available_configs/
COPY .env.example /config/.env

VOLUME /config

LABEL org.opencontainers.image.source=https://github.com/gitroomhq/postiz-app

ENTRYPOINT ["/app/entrypoint.sh"]

# Builder image
FROM base AS devcontainer

COPY nx.json tsconfig.base.json package.json package-lock.json /app/
COPY apps /app/apps/
COPY libraries /app/libraries/

RUN npm ci --no-fund && npx nx run-many --target=build --projects=frontend,backend,workers,cron

LABEL org.opencontainers.image.title="Postiz App (DevContainer)"

# Output image
FROM base AS dist

COPY --from=devcontainer /app/node_modules/ /app/node_modules/
COPY --from=devcontainer /app/dist/ /app/dist/

COPY package.json nx.json /app/

## Labels at the bottom, because CI will eventually add dates, commit hashes, etc.
LABEL org.opencontainers.image.title="Postiz App (Production)"
