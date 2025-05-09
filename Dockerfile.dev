FROM node:20-alpine3.19
RUN apk add --no-cache g++ make py3-pip supervisor bash caddy
RUN npm --no-update-notifier --no-fund --global install pnpm@10.6.1 pm2

WORKDIR /app

COPY . /app
COPY var/docker/supervisord.conf /etc/supervisord.conf
COPY var/docker/Caddyfile /app/Caddyfile
COPY var/docker/entrypoint.sh /app/entrypoint.sh
COPY var/docker/supervisord/caddy.conf /etc/supervisor.d/caddy.conf
RUN chmod +x /app/entrypoint.sh

RUN pnpm install
RUN pnpm run build

EXPOSE 4200

CMD ["pnpm", "run", "pm2"]
