#!/bin/bash

if [[ "$SKIP_CONFIG_CHECK" -ne "true" ]]; then
	if [ ! -f /config/.env ]; then
		echo "ERROR: No .env file found in /config/.env"
	fi

	ln -s /config/env /app/.env
fi

if [[ "$POSTIZ_APPS" -eq "" ]]; then
	echo "POSTIZ_APPS is not set, starting everything!"
	POSTIZ_APPS="frontend workers cron"
fi

mkdir -p /etc/supervisor.d/

cp /app/supervisord_configs/base.conf /etc/supervisor.d/

if [[ "$POSTIZ_APPS" == *"frontend"* ]]; then
	cp /app/supervisord_configs/frontend.conf /etc/supervisor.d/
fi

if [[ $POSTIZ_APPS == *"workers"* ]]; then
	cp /app/supervisord_configs/workers.conf /etc/supervisor.d/
fi

if [[ $POSTIZ_APPS == *"cron"* ]]; then
	cp /app/supervisord_configs/cron.conf /etc/supervisor.d/
fi

if [[ $POSTIZ_APPS == *"backend"* ]]; then
	cp /app/supervisord_configs/backend.conf /etc/supervisor.d/
fi

/usr/bin/supervisord
