#!/bin/bash

# Sequenced process boot for the all-in-one container.
#
# Upstream starts backend, frontend and orchestrator in parallel
# (`pnpm run --parallel pm2`). The orchestrator pre-bundles ~40 Temporal
# workflow queues at startup, which is very CPU heavy. On constrained nodes
# that CPU contention races with the backend's native-module initialization
# and can deadlock the backend before it ever binds :3000, leaving the pod
# stuck at 0/1 (readiness/startup probe is a TCP check on :3000).
#
# To avoid the race we bring the backend up first and wait until it is
# actually listening on :3000, then start the lighter frontend and the
# CPU-heavy orchestrator. This also lets the k8s startup probe pass as soon
# as the backend is ready instead of after the whole parallel boot settles.

set -e

BACKEND_PORT="${PORT:-3000}"
BACKEND_WAIT_TIMEOUT_MS="${BACKEND_WAIT_TIMEOUT_MS:-300000}"

# Reset any previous pm2 state and apply the DB schema (unchanged from upstream).
pm2 delete all || true
pnpm run prisma-db-push

# 1) Start the backend on its own.
pnpm --filter ./apps/backend run pm2

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

# 3) Start the remaining apps now that the backend is safely past init.
pnpm --filter ./apps/frontend run pm2
pnpm --filter ./apps/orchestrator run pm2

# Keep the container in the foreground by streaming logs (unchanged from upstream).
pm2 logs
