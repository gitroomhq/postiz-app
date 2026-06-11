#!/bin/bash
# Deploy Postiz to Cloudflare (Worker + Container).
#
# The container image builds fully from source (deploy/cloudflare/container/
# Dockerfile, build context = repo root): wrangler builds the linux/amd64
# image with the local Docker daemon, pushes it to the Cloudflare registry,
# and deploys the Worker. First build takes a while (full pnpm install +
# monorepo build inside Docker); later builds reuse the layer cache.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"

command -v docker >/dev/null || { echo "docker is required"; exit 1; }
docker info >/dev/null 2>&1 || { echo "docker daemon is not running"; exit 1; }

echo "==> installing worker dependencies"
(cd "$HERE" && npm install --no-fund --no-audit)

echo "==> wrangler deploy (builds + pushes the amd64 container image)"
(cd "$HERE" && npx wrangler deploy "$@")
