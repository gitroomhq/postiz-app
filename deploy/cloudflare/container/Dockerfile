# syntax=docker/dockerfile:1
# Postiz all-in-one image for Cloudflare Containers, built fully from source.
#
# Mirrors the repo's Dockerfile.dev (node 22 bookworm-slim, pnpm install,
# pnpm build, nginx + pm2) — the published ghcr.io image is an older
# Alpine/Caddy packaging that can't be overlaid — and adds:
#   - in-container Postgres + Redis + Temporal dev server
#   - entrypoint that restores state from R2 (via the fronting Worker) on
#     cold start, and a loop that backs it up continuously
#
# Container disk is EPHEMERAL: durability comes exclusively from the backup
# loop. Build context is the repo root (see image_build_context in
# wrangler.jsonc); the root .dockerignore keeps the context small.
FROM node:22.20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    make \
    python3-pip \
    bash \
    nginx \
    postgresql \
    postgresql-client \
    redis-server \
    sqlite3 \
    curl \
    ca-certificates \
    procps \
 && rm -rf /var/lib/apt/lists/*

# nginx runs as www (matches var/docker/nginx.conf), same as upstream image
RUN addgroup --system www \
 && adduser --system --ingroup www --home /www --shell /usr/sbin/nologin www \
 && mkdir -p /www \
 && chown -R www:www /www /var/lib/nginx

# Temporal CLI: single static binary whose dev server (SQLite-backed)
# replaces the temporalio/auto-setup + postgres + elasticsearch stack from
# the upstream docker-compose.
ARG TEMPORAL_CLI_VERSION=1.7.2
ARG TARGETARCH
RUN curl -fsSL "https://github.com/temporalio/cli/releases/download/v${TEMPORAL_CLI_VERSION}/temporal_cli_${TEMPORAL_CLI_VERSION}_linux_${TARGETARCH}.tar.gz" \
    | tar -xz -C /usr/local/bin temporal \
 && temporal --version

# prisma pinned to the version the repo's prisma-db-push script uses, so
# schema sync at boot downloads nothing
RUN npm --no-update-notifier --no-fund --global install pnpm@10.6.1 pm2 prisma@6.5.0

WORKDIR /app

COPY . /app
COPY var/docker/nginx.conf /etc/nginx/nginx.conf

RUN pnpm install --frozen-lockfile
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build

# Copied after the build layers so script tweaks don't bust the pnpm cache.
COPY deploy/cloudflare/container/entrypoint.sh /postiz-cf/entrypoint.sh
COPY deploy/cloudflare/container/backup.sh /postiz-cf/backup.sh
RUN chmod +x /postiz-cf/entrypoint.sh /postiz-cf/backup.sh

EXPOSE 5000
CMD ["/postiz-cf/entrypoint.sh"]
