#!/bin/bash
# Continuous state backup to R2 (through the fronting Worker's /__backup
# routes). Container disk is ephemeral — this loop IS the durability story.
# RPO == BACKUP_INTERVAL_SECONDS (default 5 minutes).
set -uo pipefail

log() { echo "[backup] $(date -u +%H:%M:%S) $*"; }

[ -z "${BACKUP_URL:-}" ] && { log "BACKUP_URL not set; backups disabled"; exit 0; }

INTERVAL="${BACKUP_INTERVAL_SECONDS:-300}"
UPLOAD_DIRECTORY="${UPLOAD_DIRECTORY:-/uploads}"
MARKER=/data/.uploads-synced

put() { # put <key> <file>
  curl -fsS -X PUT \
    -H "authorization: Bearer ${INTERNAL_SECRET:-}" \
    --data-binary @"$2" \
    -o /dev/null \
    "$BACKUP_URL/$1"
}

last_daily=''
while sleep "$INTERVAL"; do
  # --- postgres (local instance only) ---
  if [ -s /data/pg/PG_VERSION ]; then
    if su postgres -s /bin/bash -c pg_dumpall > /tmp/db.sql 2>/tmp/db.err; then
      gzip -f /tmp/db.sql
      put db-latest.sql.gz /tmp/db.sql.gz && log "postgres backed up ($(du -h /tmp/db.sql.gz | cut -f1))" \
        || log "postgres upload FAILED"
      # one rotating snapshot per day (7-day ring)
      today="$(date -u +%Y%m%d)"
      if [ "$today" != "$last_daily" ]; then
        put "db-daily-$(date -u +%u).sql.gz" /tmp/db.sql.gz && last_daily="$today"
      fi
    else
      log "pg_dumpall FAILED: $(tail -1 /tmp/db.err)"
    fi
  fi

  # --- temporal (sqlite online backup; holds scheduled-post workflow state) ---
  if [ -f /data/temporal.db ]; then
    if sqlite3 /data/temporal.db ".backup /tmp/temporal.bak" 2>/dev/null; then
      put temporal-latest.db /tmp/temporal.bak || log "temporal upload FAILED"
    fi
  fi

  # --- uploads: ship files added/changed since the last successful pass ---
  if [ -d "$UPLOAD_DIRECTORY" ]; then
    stamp=/tmp/.uploads-stamp
    touch "$stamp"
    fail=0
    while IFS= read -r file; do
      rel="${file#"$UPLOAD_DIRECTORY"/}"
      put "uploads/$rel" "$file" || { fail=1; log "upload FAILED: $rel"; }
    done < <(if [ -f "$MARKER" ]; then find "$UPLOAD_DIRECTORY" -type f -newer "$MARKER"; else find "$UPLOAD_DIRECTORY" -type f; fi)
    [ "$fail" = 0 ] && mv "$stamp" "$MARKER"
  fi
done
