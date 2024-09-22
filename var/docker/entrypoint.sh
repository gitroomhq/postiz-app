#!/bin/bash

set -o xtrace

if [[ "$SKIP_CONFIG_CHECK" != "true" ]]; then
	echo "Entrypoint: Copying /config/postiz.env into /app/.env"

	if [ ! -f /config/postiz.env ]; then
		echo "Entrypoint: WARNING: No postiz.env file found in /config/postiz.env"
	fi

	cp -vf /config/postiz.env /app/.env
fi

if [[ "$POSTIZ_APPS" -eq "" ]]; then
	echo "Entrypoint: POSTIZ_APPS is not set, starting everything!"
	POSTIZ_APPS="frontend workers cron backend"
fi

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
