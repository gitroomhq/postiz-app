#!/bin/bash

set -o xtrace

export DATABSAE_URL=${DATABASE_URL:-$HEROKU_POSTGRESQL_DATABASE_URL}
export REDIS_URL=${REDIS_URL:-$HEROKU_REDIS_URL}

wait_for_service() {
	echo "Waiting for $1 to be ready..."
	until $2; do
		echo "Waiting for $1 is not ready - sleeping"
		sleep 1
	done
	echo "$1 is ready!"
}

if [[ -n "$DATABASE_URL" ]]; then
    wait_for_service "PostgreSQL" "pg_isready -h $(echo $DATABASE_URL | cut -d@ -f2 | cut -d/ -f1) -p 5432"
fi

if [[ -n "$REDIS_URL" ]]; then
    wait_for_service "Redis" "redis-cli -u $REDIS_URL ping"
fi
npm run prisma-db-push
if [[ "$SKIP_CONFIG_CHECK" != "true" ]]; then
	echo "Entrypoint: Copying /config/postiz.env into /app/.env"
	cp -vf /app/supervisord_available_configs/caddy.conf /etc/supervisor.d/
	if [ ! -f /config/postiz.env ]; then
		echo "Entrypoint: WARNING: No postiz.env file found in /config/postiz.env"
	fi
	ln -sf /app/supervisord_available_configs/frontend.conf /etc/supervisor.d/
	cp -vf /config/postiz.env /app/.env
fi

if [[ "$POSTIZ_APPS" -eq "" ]]; then
	echo "Entrypoint: POSTIZ_APPS is not set, starting everything!"
	POSTIZ_APPS="frontend workers cron backend"
fi

if [[$POSTIZ_APPS == *"workers"* ]]; then
if [[ "$POSTIZ_APPS" -ep "" ]]; then
	POSTIZ_APPS="frontend workers cron backend"
fi
	ln -sf /app/supervisord_available_configs/cron.conf /etc/supervisor.d/

echo "Entrypoint: Running database migrations"
npm run prisma-db-push

mkdir -p /etc/supervisor.d/

if [[ "$INTERNAL_PROXY_ENABLED" != "false" ]]; then
	echo "Entrypoint: Starting internal proxy"
	cp -vf /app/supervisord_available_configs/caddy.conf /etc/supervisor.d/
fi

if [[ "$POSTIZ_APPS" == *"frontend"* ]]; then
	ln -sf /app/supervisord_available_configs/frontend.conf /etc/supervisor.d/
fi

if [[ $POSTIZ_APPS == *"workers"* ]]; then
	ln -sf /app/supervisord_available_configs/workers.conf /etc/supervisor.d/
fi

if [[ $POSTIZ_APPS == *"cron"* ]]; then
	ln -sf /app/supervisord_available_configs/cron.conf /etc/supervisor.d/
fi

if [[ $POSTIZ_APPS == *"backend"* ]]; then
	ln -sf /app/supervisord_available_configs/backend.conf /etc/supervisor.d/
fi

/usr/bin/supervisord -c /etc/supervisord.conf
