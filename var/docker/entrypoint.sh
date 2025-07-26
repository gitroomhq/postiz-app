#!/bin/bash

set -o xtrace

# Wait for port 5000 to be open (frontend)
while ! nc -z localhost 5000; do
  echo "Waiting for port 5000..."
  sleep 1
done

# Wait for port 3000 to be open
while ! nc -z localhost 3000; do
  echo "Waiting for port 3000..."
  sleep 1
done

caddy run --config /app/Caddyfile
