#!/usr/bin/env bash
# Runs once, the first time the dev container is created.
set -euo pipefail

cd /workspaces/postqueen-app

if [ ! -f .env ]; then
  echo "Creating .env from .env.example"
  # Inside the container the services are reachable by their compose service
  # names, not on localhost, so rewrite the three addresses while copying.
  sed -e 's#@localhost:5432#@db:5432#' \
      -e 's#redis://localhost:6379#redis://redis:6379#' \
      -e 's#TEMPORAL_ADDRESS="localhost:7233"#TEMPORAL_ADDRESS="temporal:7233"#' \
      .env.example > .env
  # Sign-in over plain HTTP only works with this set, and locally there is no TLS.
  grep -q '^NOT_SECURED' .env || echo 'NOT_SECURED=true' >> .env
else
  # A .env from the host is left alone. Its localhost addresses would not work
  # in here, but the compose file sets DATABASE_URL, REDIS_URL and
  # TEMPORAL_ADDRESS in the container environment, and the dev scripts load
  # .env without --override, so the container values win.
  echo "Keeping the .env that is already here"
fi

# corepack symlinks into /usr/local/bin, which needs root in this image.
sudo corepack enable

pnpm install
pnpm run prisma-db-push

echo
echo "Ready. Start her with:  pnpm run dev-backend"
echo "Then open http://localhost:4200"
