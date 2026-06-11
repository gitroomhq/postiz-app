#!/bin/bash
# Boot sequence for Postiz on Cloudflare Containers.
# Disk is ephemeral: on a fresh start this restores Postgres/Temporal/uploads
# from R2 (through the fronting Worker's /__backup routes), then starts the
# full stack and a continuous backup loop.
set -uo pipefail

log() { echo "[postiz-cf] $(date -u +%H:%M:%S) $*"; }

DATA_DIR=/data
mkdir -p "$DATA_DIR"

# ---------- environment ----------
export CF_GATEWAY_ID="${CF_GATEWAY_ID:-x}"
# Feature gates across the app check OPENAI_API_KEY; the AI Gateway token
# doubles as the OpenAI-compatible api key (see ai.gateway.config.ts).
export OPENAI_API_KEY="${OPENAI_API_KEY:-${CF_AIG_TOKEN:-}}"
export DATABASE_URL="${DATABASE_URL:-postgresql://postiz:postiz@127.0.0.1:5432/postiz}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
export TEMPORAL_ADDRESS="${TEMPORAL_ADDRESS:-127.0.0.1:7233}"
export BACKEND_INTERNAL_URL="${BACKEND_INTERNAL_URL:-http://127.0.0.1:3000}"
export STORAGE_PROVIDER="${STORAGE_PROVIDER:-local}"
export UPLOAD_DIRECTORY="${UPLOAD_DIRECTORY:-/uploads}"
export NEXT_PUBLIC_UPLOAD_DIRECTORY="${NEXT_PUBLIC_UPLOAD_DIRECTORY:-/uploads}"
export IS_GENERAL="${IS_GENERAL:-true}"
export NX_ADD_PLUGINS=false
mkdir -p "$UPLOAD_DIRECTORY"

# The apps' start scripts load /app/.env via dotenv-cli; materialize the
# container env there so every pm2 process sees the same configuration.
ENV_KEYS=(
  MAIN_URL FRONTEND_URL NEXT_PUBLIC_BACKEND_URL BACKEND_INTERNAL_URL
  JWT_SECRET DATABASE_URL REDIS_URL TEMPORAL_ADDRESS
  IS_GENERAL DISABLE_REGISTRATION API_LIMIT NX_ADD_PLUGINS
  STORAGE_PROVIDER UPLOAD_DIRECTORY NEXT_PUBLIC_UPLOAD_DIRECTORY
  OPENAI_API_KEY CF_ACCOUNT_ID CF_GATEWAY_ID CF_AIG_TOKEN
  AI_TEXT_MODEL AI_IMAGE_MODEL AI_IMAGE_BASE_URL
  BACKUP_URL INTERNAL_SECRET
)
: > /app/.env
for key in "${ENV_KEYS[@]}"; do
  value="${!key:-}"
  [ -n "$value" ] && printf '%s="%s"\n' "$key" "$value" >> /app/.env
done

# Authenticated helper for the Worker's /__backup routes.
bk() { curl -fsS --connect-timeout 10 -H "authorization: Bearer ${INTERNAL_SECRET:-}" "$@"; }

# Boot progress reporting: containers have no easily reachable stdout from the
# CLI, so milestones (and a diagnostics bundle) are PUT to R2 through the
# Worker — readable with: GET $BACKUP_URL/boot-status.txt
BOOT_LOG=/tmp/boot-status.txt
report() {
  log "$*"
  echo "$(date -u +%H:%M:%S) $*" >> "$BOOT_LOG"
  [ -n "${BACKUP_URL:-}" ] && bk -X PUT --data-binary @"$BOOT_LOG" "$BACKUP_URL/boot-status.txt" >/dev/null 2>&1
}
diagnostics() {
  {
    echo "=== $(date -u) exit=$? ==="
    echo "--- df -h ---"; df -h 2>&1
    echo "--- ps ---"; ps aux 2>&1 | head -30
    echo "--- pg startup.log ---"; tail -30 "$DATA_DIR/pg/startup.log" 2>&1
    echo "--- temporal.log ---"; tail -20 "$DATA_DIR/temporal.log" 2>&1
    echo "--- pm2 list ---"; pm2 list 2>&1
    echo "--- pm2 logs ---"; pm2 logs --nostream --lines 40 2>&1 | tail -80
  } > /tmp/diagnostics.txt
  [ -n "${BACKUP_URL:-}" ] && bk -X PUT --data-binary @/tmp/diagnostics.txt "$BACKUP_URL/diagnostics.txt" >/dev/null 2>&1
}
trap diagnostics EXIT
report "boot start (entrypoint $(md5sum /postiz-cf/entrypoint.sh | cut -c1-8))"

# ---------- postgres (skipped when DATABASE_URL points elsewhere) ----------
FRESH_DB=0
if [[ "$DATABASE_URL" == *"127.0.0.1"* || "$DATABASE_URL" == *"localhost"* ]]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin | head -1)"
  PGDATA="$DATA_DIR/pg"
  # /run is a fresh tmpfs on Cloudflare's runtime (unlike plain docker run),
  # so the socket/lock dir baked in by apt does not exist at boot.
  mkdir -p /var/run/postgresql
  chown postgres:postgres /var/run/postgresql
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    FRESH_DB=1
    log "initializing fresh postgres data dir"
    mkdir -p "$PGDATA"
    chown -R postgres:postgres "$PGDATA"
    su postgres -s /bin/bash -c "'$PGBIN/initdb' -D '$PGDATA' -U postgres --auth-local=trust --auth-host=md5" >/dev/null
  fi
  chown -R postgres:postgres "$PGDATA"
  # log inside PGDATA — /data is root-owned and pg_ctl runs as postgres
  su postgres -s /bin/bash -c "'$PGBIN/pg_ctl' -D '$PGDATA' -l '$PGDATA/startup.log' -w -t 60 start"
  report "postgres started (pg_ctl exit $?)"

  su postgres -s /bin/bash -c "psql -tAc \"SELECT 1 FROM pg_roles WHERE rolname='postiz'\" | grep -q 1" \
    || su postgres -s /bin/bash -c "psql -c \"CREATE ROLE postiz LOGIN PASSWORD 'postiz' SUPERUSER\""
  su postgres -s /bin/bash -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='postiz'\" | grep -q 1" \
    || su postgres -s /bin/bash -c "createdb -O postiz postiz"

  if [ "$FRESH_DB" = 1 ] && [ -n "${BACKUP_URL:-}" ]; then
    if bk -o /tmp/db-restore.sql.gz "$BACKUP_URL/db-latest.sql.gz" 2>/dev/null; then
      log "restoring postgres from R2 backup"
      # pg_dumpall output: pre-existing role/db statements fail harmlessly.
      gunzip -c /tmp/db-restore.sql.gz | su postgres -s /bin/bash -c psql >/dev/null 2>&1
      rm -f /tmp/db-restore.sql.gz
      report "postgres restore finished"
    else
      report "no postgres backup found (first boot)"
    fi
  fi
fi

# ---------- redis (cache only — no persistence needed) ----------
if [[ "$REDIS_URL" == *"127.0.0.1"* || "$REDIS_URL" == *"localhost"* ]]; then
  redis-server --daemonize yes --dir "$DATA_DIR" --save '' --appendonly no
fi

# ---------- temporal dev server (SQLite-backed) ----------
if [[ "$TEMPORAL_ADDRESS" == "127.0.0.1:"* || "$TEMPORAL_ADDRESS" == "localhost:"* ]]; then
  if [ ! -f "$DATA_DIR/temporal.db" ] && [ -n "${BACKUP_URL:-}" ]; then
    bk -o "$DATA_DIR/temporal.db" "$BACKUP_URL/temporal-latest.db" 2>/dev/null \
      && log "restored temporal state from R2 backup" \
      || rm -f "$DATA_DIR/temporal.db"
  fi
  TEMPORAL_PORT="${TEMPORAL_ADDRESS##*:}"
  nohup temporal server start-dev \
    --headless \
    --ip 127.0.0.1 \
    --port "$TEMPORAL_PORT" \
    --db-filename "$DATA_DIR/temporal.db" \
    --log-level warn \
    > "$DATA_DIR/temporal.log" 2>&1 &
  for _ in $(seq 1 60); do
    (echo > "/dev/tcp/127.0.0.1/$TEMPORAL_PORT") 2>/dev/null && break
    sleep 1
  done
  report "temporal dev server is up on $TEMPORAL_ADDRESS"
fi

# ---------- uploads restore (background; media for already-scheduled posts) ----------
if [ -n "${BACKUP_URL:-}" ]; then
  (
    bk "$BACKUP_URL/?list=uploads/" 2>/dev/null | while IFS= read -r key; do
      [ -z "$key" ] && continue
      rel="${key#uploads/}"
      file="$UPLOAD_DIRECTORY/$rel"
      if [ ! -f "$file" ]; then
        mkdir -p "$(dirname "$file")"
        bk -o "$file" "$BACKUP_URL/$key" 2>/dev/null || rm -f "$file"
      fi
    done
    log "uploads restore pass complete"
  ) &
fi

# ---------- schema sync + services ----------
report "running prisma db push"
prisma db push --accept-data-loss --skip-generate \
  --schema /app/libraries/nestjs-libraries/src/database/prisma/schema.prisma

report "prisma db push finished (exit $?)"

nginx
report "nginx started on :5000"

nohup /postiz-cf/backup.sh > "$DATA_DIR/backup.log" 2>&1 &

cd /app
# Spawn the pm2 daemon BEFORE the parallel starts: concurrent `pm2 start`
# calls race to create the daemon and registrations get dropped (upstream's
# pm2-run serializes the same way via `pm2 delete all`).
pm2 delete all >/dev/null 2>&1 || true
pnpm run --parallel pm2
report "postiz processes started"
# steady-state diagnostics snapshot ~2 min after boot
( sleep 120; diagnostics ) &
exec pm2 logs --raw
