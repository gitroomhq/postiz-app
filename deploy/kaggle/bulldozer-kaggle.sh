#!/usr/bin/env bash
# Bulldozer Social - temporary test run on Kaggle (no Docker).
# Starts Postgres, Redis, Temporal (dev server), nginx and a Cloudflare quick tunnel,
# builds this repo and runs backend + orchestrator + frontend behind one public URL.
# For testing only: everything lives on the session disk and is gone when the session ends.
set -euo pipefail

WORK=${WORK:-/root/bulldozer}
REPO_URL=${REPO_URL:-https://github.com/Dev-saged/postiz-app}
BRANCH=${BRANCH:-feature/bulldozer-replies}
NODE_VERSION=22.23.4
APP=$WORK/postiz-app
LOGS=$WORK/logs

: "${INSTAGRAM_APP_ID:?INSTAGRAM_APP_ID is missing (Kaggle secret)}"
: "${INSTAGRAM_APP_SECRET:?INSTAGRAM_APP_SECRET is missing (Kaggle secret)}"
VERIFY_TOKEN=${AUTO_REPLIES_WEBHOOK_VERIFY_TOKEN:-$(openssl rand -hex 12)}

mkdir -p "$WORK" "$LOGS" "$WORK/uploads"
export DEBIAN_FRONTEND=noninteractive

step() { echo; echo "==> $*"; }

step "[1/8] System packages"
apt-get update -qq
apt-get install -y -qq postgresql redis-server nginx xz-utils curl git openssl >/dev/null

step "[2/8] Node $NODE_VERSION + pnpm + pm2"
if [ "$(node -v 2>/dev/null || true)" != "v$NODE_VERSION" ]; then
  [ -d "/opt/node-v$NODE_VERSION-linux-x64" ] ||
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" | tar -xJ -C /opt
fi
export PATH="/opt/node-v$NODE_VERSION-linux-x64/bin:$PATH"
npm install -g pnpm@10.6.1 pm2 >/dev/null 2>&1

step "[3/8] Temporal CLI + cloudflared"
if [ ! -x /opt/temporal/temporal ]; then
  mkdir -p /opt/temporal
  curl -fsSL "https://temporal.download/cli/archive/latest?platform=linux&arch=amd64" | tar -xz -C /opt/temporal
fi
if [ ! -x /usr/local/bin/cloudflared ]; then
  curl -fsSL -o /usr/local/bin/cloudflared \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x /usr/local/bin/cloudflared
fi

step "[4/8] Postgres, Redis, Temporal"
service postgresql start >/dev/null
su postgres -c "psql -qtAc \"ALTER USER postgres PASSWORD 'postgres'\""
su postgres -c "psql -qtAc \"SELECT 1 FROM pg_database WHERE datname='postiz'\"" | grep -q 1 ||
  su postgres -c "createdb postiz"
redis-cli ping >/dev/null 2>&1 || redis-server --daemonize yes >/dev/null
if ! (exec 3<>/dev/tcp/127.0.0.1/7233) 2>/dev/null; then
  nohup /opt/temporal/temporal server start-dev \
    --ip 127.0.0.1 --port 7233 --ui-port 8233 \
    --db-filename "$WORK/temporal.db" \
    --search-attribute organizationId=Text \
    --search-attribute postId=Text \
    > "$LOGS/temporal.log" 2>&1 &
fi

step "[5/8] Public URL (Cloudflare quick tunnel)"
pkill -f "cloudflared tunnel" 2>/dev/null || true
: > "$LOGS/tunnel.log"
nohup cloudflared tunnel --url http://localhost:5000 --no-autoupdate > "$LOGS/tunnel.log" 2>&1 &
URL=""
for _ in $(seq 1 60); do
  URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOGS/tunnel.log" | head -1 || true)
  [ -n "$URL" ] && break
  sleep 2
done
[ -n "$URL" ] || { echo "Tunnel did not start, see $LOGS/tunnel.log"; exit 1; }

step "[6/8] Code + .env"
[ -d "$APP/.git" ] || git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$APP"
cd "$APP"
cat > .env <<EOF
MAIN_URL=$URL
FRONTEND_URL=$URL
NEXT_PUBLIC_BACKEND_URL=$URL/api
BACKEND_INTERNAL_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postiz
REDIS_URL=redis://localhost:6379
TEMPORAL_ADDRESS=localhost:7233
JWT_SECRET=$(openssl rand -hex 32)
IS_GENERAL=true
DISABLE_REGISTRATION=false
STORAGE_PROVIDER=local
UPLOAD_DIRECTORY=$WORK/uploads
NEXT_PUBLIC_UPLOAD_DIRECTORY=/uploads
INSTAGRAM_APP_ID=$INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET=$INSTAGRAM_APP_SECRET
INSTAGRAM_AUTO_REPLIES=true
AUTO_REPLIES_WEBHOOK_VERIFY_TOKEN=$VERIFY_TOKEN
EOF
chmod 600 .env

# Same routing as the official image: /api -> backend, /uploads -> files, / -> frontend
sed -e 's#^user .*#user root;#' -e "s#alias /uploads/;#alias $WORK/uploads/;#" \
  var/docker/nginx.conf > /etc/nginx/nginx.conf
nginx -t -q
nginx -s reload 2>/dev/null || nginx

step "[7/8] Install + build (first run takes a while)"
pnpm install --frozen-lockfile
pnpm run prisma-db-push
if [ "${REBUILD:-0}" = "1" ] || [ ! -d apps/backend/dist ] || [ ! -d apps/orchestrator/dist ] || [ ! -d apps/frontend/.next ]; then
  NODE_OPTIONS=--max-old-space-size=8192 pnpm run build
fi

step "[8/8] Start"
pm2 delete all >/dev/null 2>&1 || true
pm2 start "pnpm run start:prod:backend" --name backend >/dev/null
pm2 start "pnpm run start:prod:orchestrator" --name orchestrator >/dev/null
pm2 start "pnpm run start:prod:frontend" --name frontend >/dev/null

for _ in $(seq 1 90); do
  curl -s -o /dev/null "http://localhost:5000/api/auto-replies-webhook/instagram-standalone?hub.mode=subscribe&hub.verify_token=$VERIFY_TOKEN&hub.challenge=ok" && break
  sleep 2
done

cat <<EOF

================ Bulldozer Social is running ================
App (register the first user here):  $URL
Instagram OAuth redirect URI:        $URL/integrations/social/instagram-standalone
Webhook callback URL:                $URL/api/auto-replies-webhook/instagram-standalone
Webhook verify token:                $VERIFY_TOKEN
Logs: pm2 logs  |  $LOGS
The tunnel URL changes every run: update the redirect URI and webhook in the Meta app each time.
=============================================================
EOF
