# ---- Dependencies stage ----
FROM node:20-alpine3.19 AS deps

RUN apk add --no-cache g++ make py3-pip bash
RUN npm --no-update-notifier --no-fund --global install pnpm@10.6.1

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/*/package.json ./apps/
COPY libraries/*/package.json ./libraries/

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --ignore-scripts

# ---- Build stage ----
FROM deps AS build

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install

RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build:backend
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build:workers
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build:cron
RUN NODE_OPTIONS="--max-old-space-size=4096" pnpm run build:frontend

# ---- Production dependencies stage ---
FROM node:20-alpine3.19 AS prod-deps

RUN npm --no-update-notifier --no-fund --global install pnpm@10.6.1

WORKDIR /app

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/root/.pnpm-store \
    pnpm install --prod

# --- Runtime stage ----
FROM node:20-alpine3.19 AS runtime

RUN apk add --no-cache nginx bash && \
    adduser -D -g 'www' www && \
    mkdir /www && \
    chown -R www:www /var/lib/nginx /www && \
    rm -rf /var/cache/apk/*

WORKDIR /app

RUN npm --no-update-notifier --no-fund --global install pm2 pnpm@10.6.1 && \
    npm cache clean --force

COPY package.json pnpm-workspace.yaml ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY --from=build /app/libraries ./libraries
COPY var/docker/nginx.conf /etc/nginx/nginx.conf

# cleanup
RUN rm -rf /root/.npm /root/.pnpm-store /tmp/* /var/cache/apk/* && \
    find . -name "*.map" -delete && \
    find . -name "*.ts" -delete && \
    find . -name "*.tsx" -delete && \
    find . -name "*.jsx" -delete && \
    find . -name "*.md" -delete && \
    find . -name "LICENSE" -delete && \
    find . -name "CHANGELOG" -delete && \
    find . -name "README" -delete && \
    find . -name "test" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find . -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find . -name "*.test.*" -delete && \
    find . -name "*.spec.*" -delete

EXPOSE 5000

CMD ["sh", "-c", "nginx && pnpm run pm2"]
