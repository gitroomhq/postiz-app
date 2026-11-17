#!/usr/bin/env bash
# Start the self-hosted Postiz stack on Linux.
# Usage: ./setup-linux.sh [--with-ngrok] [--no-build]

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
ENV_FILE="$ROOT_DIR/.env"
WITH_NGROK=false
BUILD=true

usage() {
  cat <<'EOF'
Usage: ./setup-linux.sh [options]

Options:
  --with-ngrok  Start the optional ngrok tunnel profile after the stack starts.
  --no-build    Start existing images without rebuilding them.
  -h, --help    Show this help message.
EOF
}

while (($#)); do
  case "$1" in
    --with-ngrok) WITH_NGROK=true ;;
    --no-build) BUILD=false ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
  shift
done

fail() {
  echo "Error: $*" >&2
  exit 1
}

command -v docker >/dev/null 2>&1 || fail "Docker is required. Install Docker Engine and the Docker Compose plugin first."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required (the 'docker compose' command)."
command -v openssl >/dev/null 2>&1 || fail "OpenSSL is required to generate local secrets."
[[ -f "$COMPOSE_FILE" ]] || fail "Missing $COMPOSE_FILE"

if ! docker info >/dev/null 2>&1; then
  fail "The Docker daemon is not available. Start Docker or add your user to the docker group."
fi

if [[ ! -f "$ENV_FILE" ]]; then
  umask 077
  cat > "$ENV_FILE" <<EOF
# Created by setup-linux.sh. Keep this file private.
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 48)
MAIN_URL=http://localhost:4007
FRONTEND_URL=http://localhost:4007
STORAGE_PROVIDER=local
UPLOAD_DIRECTORY=/uploads
NEXT_PUBLIC_UPLOAD_DIRECTORY=/uploads
ADMIN_UI_PORT=3001
POSTIZ_PORT=4007
TEMPORAL_UI_PORT=8082
EOF
  echo "Created $ENV_FILE with new local secrets."
fi

cd "$ROOT_DIR"
compose=(docker compose -f "$COMPOSE_FILE")

if [[ "$BUILD" == true ]]; then
  "${compose[@]}" up -d --build
else
  "${compose[@]}" up -d
fi

if [[ "$WITH_NGROK" == true ]]; then
  if ! grep -qE '^NGROK_AUTHTOKEN=.+$' "$ENV_FILE"; then
    echo "ngrok was not started: add NGROK_AUTHTOKEN=your_token to $ENV_FILE, then rerun with --with-ngrok." >&2
  else
    "${compose[@]}" --profile tunnel up -d ngrok
  fi
fi

echo
echo "Postiz:   http://localhost:4007"
echo "Admin UI: http://localhost:3001"
echo "Temporal: http://localhost:8082"
echo
echo "Check readiness with: docker compose -f docker-compose.yml ps"
