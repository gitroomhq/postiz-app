# Foundation image
FROM registry.fedoraproject.org/fedora-minimal:40 AS foundation

RUN microdnf install --nodocs --noplugins --setopt=keepcache=0 --setopt=install_weak_deps=0 -y \
	npm \
	node \
	&& microdnf clean all

# Builder image
FROM foundation AS builder

run mkdir /src

COPY . /src

WORKDIR /src

RUN npx nx reset
RUN npm run build

# Output image
FROM foundation AS dist

LABEL org.opencontainers.image.source=https://github.com/gitroomhq/postiz-app
LABEL org.opencontainers.image.title="Postiz App"

RUN mkdir -p /config /app

COPY --from=builder /src/dist /app/dist/
COPY --from=builder /src/package.json /app/
COPY --from=builder /src/nx.json /app/

EXPOSE 4200
EXPOSE 3000

WORKDIR /app

ENTRYPOINT ["npm", "run", "dev"]
