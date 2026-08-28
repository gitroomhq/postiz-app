#!/usr/bin/env bash

set -Eeuo pipefail

# Deploy only the already-built LinkedIn Page provider files to the public
# Docker Compose Postiz instance. Keeping the rest of the official image
# intact is important: it preserves the matching Prisma Client/runtime.
# This script deliberately does not read, print, or copy the Compose .env.

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script with sudo: sudo $0" >&2
  exit 1
fi

RELEASE_DIR="${POSTIZ_RELEASE_DIR:-/home/ubuntu/a001/releases/ai001-mkt-005-linkedin-oauth-20260828T183841Z}"
OVERLAY_DIR="${POSTIZ_OVERLAY_DIR:-$RELEASE_DIR/overlay}"
COMPOSE_DIR="${POSTIZ_COMPOSE_DIR:-/home/ubuntu/a001/git/dappgo-marketing-agent/runtime/postiz-docker-compose}"

SERVICE="postiz"
BASE_IMAGE="${POSTIZ_BASE_IMAGE:-ghcr.io/gitroomhq/postiz-app@sha256:785f97312f66a347fb96cdccc4ded5a33ced69a672c89a9adc8054e7d6a21dc5}"
IMAGE_TAG="${POSTIZ_IMAGE_TAG:-dappgo/postiz:ai001-mkt-005-linkedin-oauth-841f4d8b}"

PROVIDER_RELATIVE="libraries/nestjs-libraries/src/integrations/social/linkedin.page.provider.js"
BACKEND_PROVIDER="$OVERLAY_DIR/apps/backend/dist/$PROVIDER_RELATIVE"
ORCHESTRATOR_PROVIDER="$OVERLAY_DIR/apps/orchestrator/dist/$PROVIDER_RELATIVE"

COMPOSE_BASE="$COMPOSE_DIR/docker-compose.yaml"
COMPOSE_OVERRIDE="$COMPOSE_DIR/docker-compose.override.yml"
COMPOSE_ENV="$COMPOSE_DIR/.env"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "missing command: $1"
}

require_command docker
require_command curl
require_command grep
require_command awk
require_command sed
require_command timeout
require_command install

[[ -d "$RELEASE_DIR" ]] || die "release directory not found: $RELEASE_DIR"
[[ -d "$OVERLAY_DIR" ]] || die "overlay directory not found: $OVERLAY_DIR"
[[ -f "$COMPOSE_BASE" ]] || die "Compose file not found: $COMPOSE_BASE"
[[ -f "$COMPOSE_OVERRIDE" ]] || die "Compose override not found: $COMPOSE_OVERRIDE"
[[ -f "$COMPOSE_ENV" ]] || die "Compose .env not found: $COMPOSE_ENV"

validate_provider() {
  local provider="$1"
  [[ -s "$provider" ]] || die "compiled provider not found: $provider"
  grep -Fq 'rest/organizationAcls' "$provider" || die "organizationAcls endpoint missing: $provider"
  grep -Fq 'api.linkedin.com/v2/me' "$provider" || die "Community Management profile endpoint missing: $provider"
  if grep -Fq 'prompt=none' "$provider"; then
    die "silent OAuth prompt is still present: $provider"
  fi
  if grep -Fq 'api.linkedin.com/v2/userinfo' "$provider"; then
    die "OIDC userinfo endpoint is still present: $provider"
  fi
}

validate_provider "$BACKEND_PROVIDER"
validate_provider "$ORCHESTRATOR_PROVIDER"
echo "SOURCE_CHECK_OK"

OLD_IMAGE="$(docker inspect "$SERVICE" --format '{{.Config.Image}}')"
OLD_STATE="$(docker inspect "$SERVICE" --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}')"

BACKUP_DIR="$RELEASE_DIR/backup-linkedin-oauth-$(date -u +%Y%m%dT%H%M%SZ)"
install -d -m 700 "$BACKUP_DIR"
printf 'image=%s\nstate=%s\n' "$OLD_IMAGE" "$OLD_STATE" > "$BACKUP_DIR/postiz-before.txt"
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' > "$BACKUP_DIR/containers-before.txt"

WORK_DIR="$(mktemp -d "$RELEASE_DIR/deploy.XXXXXX")"
NEW_OVERRIDE="$WORK_DIR/docker-compose.linkedin-image.yaml"
ROLLBACK_OVERRIDE="$WORK_DIR/docker-compose.rollback-image.yaml"
TEMP_CONTAINER="postiz-linkedin-overlay-841f4d8b"
TEMP_CREATED=0

cleanup() {
  if (( TEMP_CREATED )); then
    timeout --foreground 20s docker rm -f "$TEMP_CONTAINER" >/dev/null 2>&1 || true
  fi
  rm -f "$NEW_OVERRIDE" "$ROLLBACK_OVERRIDE"
  rmdir "$WORK_DIR" 2>/dev/null || true
}
trap cleanup EXIT

echo "CREATING_PROVIDER_OVERLAY=$IMAGE_TAG"
docker rm -f "$TEMP_CONTAINER" >/dev/null 2>&1 || true
docker create --name "$TEMP_CONTAINER" --entrypoint sh "$BASE_IMAGE" -c 'sleep 600' >/dev/null
TEMP_CREATED=1
docker start "$TEMP_CONTAINER" >/dev/null

TEMP_PID="$(docker inspect --format '{{.State.Pid}}' "$TEMP_CONTAINER")"
[[ "$TEMP_PID" =~ ^[0-9]+$ ]] || die "could not resolve temporary container PID"
SNAPSHOT_UPPER="$(sed -n 's/.*upperdir=\([^,]*\).*/\1/p' "/proc/$TEMP_PID/mountinfo" | head -1)"
case "$SNAPSHOT_UPPER" in
  /var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/*/fs) ;;
  *) die "unexpected Docker snapshot path: $SNAPSHOT_UPPER" ;;
esac
[[ -d "$SNAPSHOT_UPPER" ]] || die "Docker snapshot directory is not available"

docker stop "$TEMP_CONTAINER" >/dev/null
install -D -o 0 -g 0 -m 0644 "$BACKEND_PROVIDER" \
  "$SNAPSHOT_UPPER/app/apps/backend/dist/$PROVIDER_RELATIVE"
install -D -o 0 -g 0 -m 0644 "$ORCHESTRATOR_PROVIDER" \
  "$SNAPSHOT_UPPER/app/apps/orchestrator/dist/$PROVIDER_RELATIVE"

grep -Fq 'rest/organizationAcls' \
  "$SNAPSHOT_UPPER/app/apps/backend/dist/$PROVIDER_RELATIVE"
grep -Fq 'api.linkedin.com/v2/me' \
  "$SNAPSHOT_UPPER/app/apps/backend/dist/$PROVIDER_RELATIVE"
echo "PROVIDER_FILES_COPIED"

docker commit \
  --pause=false \
  --change 'ENTRYPOINT ["docker-entrypoint.sh"]' \
  --change 'CMD ["sh","-c","nginx && pnpm run pm2"]' \
  "$TEMP_CONTAINER" "$IMAGE_TAG" >/dev/null
docker rm "$TEMP_CONTAINER" >/dev/null
TEMP_CREATED=0
docker image inspect "$IMAGE_TAG" >/dev/null
IMAGE_CONFIG="$(docker image inspect "$IMAGE_TAG" --format '{{json .Config.Entrypoint}}|{{json .Config.Cmd}}')"
[[ "$IMAGE_CONFIG" == '["docker-entrypoint.sh"]|["sh","-c","nginx && pnpm run pm2"]' ]] \
  || die "official Postiz entrypoint/cmd was not preserved: $IMAGE_CONFIG"
echo "IMAGE_CREATED=$IMAGE_TAG"

write_image_override() {
  local path="$1"
  local image="$2"
  printf '%s\n' \
    'services:' \
    '  postiz:' \
    "    image: $image" \
    > "$path"
}

compose_with_override() {
  local override="$1"
  shift
  docker compose \
    --project-directory "$COMPOSE_DIR" \
    --env-file "$COMPOSE_ENV" \
    -f "$COMPOSE_BASE" \
    -f "$COMPOSE_OVERRIDE" \
    -f "$override" \
    "$@"
}

wait_for_healthy() {
  local deadline=$((SECONDS + 180))
  local state
  while (( SECONDS < deadline )); do
    state="$(docker inspect "$SERVICE" --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' 2>/dev/null || true)"
    echo "POSTIZ_STATUS=$state"
    [[ "$state" == "running healthy" ]] && return 0
    sleep 5
  done
  return 1
}

rollback() {
  echo "ROLLBACK_IMAGE=$OLD_IMAGE" >&2
  write_image_override "$ROLLBACK_OVERRIDE" "$OLD_IMAGE"
  compose_with_override "$ROLLBACK_OVERRIDE" up -d --no-deps --force-recreate "$SERVICE" >/dev/null
  wait_for_healthy || true
  echo "ROLLBACK_ATTEMPTED" >&2
}

write_image_override "$NEW_OVERRIDE" "$IMAGE_TAG"
compose_with_override "$NEW_OVERRIDE" config --images | grep -Fxq "$IMAGE_TAG" \
  || die "Compose did not resolve the requested Postiz image"

echo "RECREATING_SERVICE=$SERVICE"
compose_with_override "$NEW_OVERRIDE" up -d --no-deps --force-recreate "$SERVICE"

if ! wait_for_healthy; then
  echo "Postiz did not become healthy; rolling back" >&2
  rollback
  exit 1
fi

CURRENT_IMAGE="$(docker inspect "$SERVICE" --format '{{.Config.Image}}')"
if [[ "$CURRENT_IMAGE" != "$IMAGE_TAG" ]]; then
  echo "Postiz is using unexpected image: $CURRENT_IMAGE" >&2
  rollback
  exit 1
fi

docker exec "$SERVICE" sh -lc '
set -eu
for P in \
  /app/apps/backend/dist/libraries/nestjs-libraries/src/integrations/social/linkedin.page.provider.js \
  /app/apps/orchestrator/dist/libraries/nestjs-libraries/src/integrations/social/linkedin.page.provider.js
do
  test -s "$P"
  grep -Fq "rest/organizationAcls" "$P"
  grep -Fq "api.linkedin.com/v2/me" "$P"
  ! grep -Fq "prompt=none" "$P"
  ! grep -Fq "api.linkedin.com/v2/userinfo" "$P"
done
echo CONTAINER_CODE_CHECK_OK
'

HTTP_CODE="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' https://postiz.dappgo.com/)"
if [[ ! "$HTTP_CODE" =~ ^[23][0-9][0-9]$ ]]; then
  echo "Public Postiz returned HTTP $HTTP_CODE; rolling back" >&2
  rollback
  exit 1
fi

echo "PUBLIC_HTTP=$HTTP_CODE"
echo "SERVICES"
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | grep -E '^(postiz|postiz-caddy|n8n-)' || true

echo "DEPLOY_OK image=$CURRENT_IMAGE backup=$BACKUP_DIR"
