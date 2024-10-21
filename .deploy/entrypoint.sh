#!/bin/bash
set -e

# Function to wait for services
wait_for_service() {
    echo "Waiting for $1 to be ready..."
    until $2; do
        echo "Service $1 is not ready - sleeping"
        sleep 1
    done
    echo "$1 is ready!"
}

# Wait for PostgreSQL
wait_for_service "PostgreSQL" "pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER"

# Wait for Redis
wait_for_service "Redis" "redis-cli -h $REDIS_HOST -p $REDIS_PORT ping"

if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    npm run db:migrate
fi

# Start supervisor
exec /usr/bin/supervisord -n -c /etc/supervisord.conf