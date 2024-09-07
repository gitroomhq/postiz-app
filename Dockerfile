FROM node:20.9.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
# Install python/pip for node-gyp
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 make build-base gcc && \
  ln -sf python3 /usr/bin/python && \
  python3 -m ensurepip && \
  pip3 install --no-cache --upgrade pip setuptools

WORKDIR /app
COPY . /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpx nx run-many --target=build --projects=frontend

FROM base AS prod
# Should be prod-deps but it's not working
COPY --from=build /app/node_modules /app/node_modules 
COPY --from=build /app/dist /app/dist

EXPOSE 4200
EXPOSE 3000

LABEL org.opencontainers.image.source=https://github.com/gitroomhq/postiz-app
LABEL org.opencontainers.image.title="Postiz App"

CMD ["npm", "run", "start:prod"]