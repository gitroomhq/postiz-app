#!/bin/bash

if [[ "$SKIP_CONFIG_CHECK" != "true" ]]; then
	echo "symlinking /config/.env into /app/.env"

	if [ ! -f /config/.env ]; then
		echo "ERROR: No .env file found in /config/.env"
	fi

	ln -sf /config/.env /app/.env
fi

if [[ "$POSTIZ_APPS" -eq "" ]]; then
	echo "POSTIZ_APPS is not set, starting everything!"
	POSTIZ_APPS="frontend workers cron backend"
fi

echo "Running database migrations"
npm run prisma-db-push

mkdir -p /etc/supervisor.d/

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

/usr/bin/supervisord
