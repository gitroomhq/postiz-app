#!/bin/bash

# Sequenced process boot for the all-in-one container.
#
# Two problems with the upstream boot (`pnpm run --parallel pm2`, which does
# `pm2 start pnpm -- start` for every app):
#
# 1. Parallel start + heavy orchestrator bundling contends for CPU on
#    constrained nodes.
# 2. More importantly, launching the Node apps through the
#    pm2 -> pnpm -> dotenv-cli -> node wrapper chain intermittently deadlocks
#    the backend during native-module initialization: the process parks on a
#    futex at ~80MB before Nest starts and never binds :3000, so the pod stays
#    at 0/1 (the startup/readiness probe is a TCP check on :3000). Launching
#    `node` directly (no pnpm/dotenv wrapper processes) boots reliably.
#
# So we launch the backend and orchestrator directly with node, bring the
# backend up first and wait until it is listening on :3000, then start the
# orchestrator and the frontend. `node --env-file-if-exists` preserves .env
# loading for self-hosted setups (no-op when the file is absent, e.g. in k8s
# where config is injected as env vars) without the extra wrapper processes.

set -e

BACKEND_PORT="${PORT:-3000}"
BACKEND_WAIT_TIMEOUT_MS="${BACKEND_WAIT_TIMEOUT_MS:-300000}"
ENV_FILE="${POSTIZ_ENV_FILE:-/app/.env}"

# Reset any previous pm2 state and apply the DB schema (unchanged from upstream).
pm2 delete all || true
pnpm run prisma-db-push

# 1) Start the backend on its own, directly with node.
pm2 start node --name backend --cwd /app/apps/backend -- \
  --env-file-if-exists="$ENV_FILE" \
  --experimental-require-module ./dist/apps/backend/src/main.js

# 2) Wait until the backend is accepting connections on its port.
echo "Waiting for backend to listen on :${BACKEND_PORT} (timeout ${BACKEND_WAIT_TIMEOUT_MS}ms)..."
BACKEND_PORT="$BACKEND_PORT" BACKEND_WAIT_TIMEOUT_MS="$BACKEND_WAIT_TIMEOUT_MS" node -e '
const net = require("net");
const port = Number(process.env.BACKEND_PORT || 3000);
const timeout = Number(process.env.BACKEND_WAIT_TIMEOUT_MS || 300000);
const start = Date.now();
(function check() {
  const socket = net.connect(port, "127.0.0.1", () => {
    socket.end();
    console.log("Backend is up on :" + port);
    process.exit(0);
  });
  socket.on("error", () => {
    socket.destroy();
    if (Date.now() - start > timeout) {
      console.error("Timed out waiting for backend :" + port);
      process.exit(1);
    }
    setTimeout(check, 1000);
  });
})();
'

# 3) Start the orchestrator (also directly with node) and the frontend now that
#    the backend is safely past init. The frontend uses its workspace script
#    (`next start`), which does not hit the native-init deadlock.
pm2 start node --name orchestrator --cwd /app/apps/orchestrator -- \
  --env-file-if-exists="$ENV_FILE" \
  --experimental-require-module ./dist/apps/orchestrator/src/main.js
pnpm --filter ./apps/frontend run pm2

# Keep the container in the foreground by streaming logs (unchanged from upstream).
pm2 logs
