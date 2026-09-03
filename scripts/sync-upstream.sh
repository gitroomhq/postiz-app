#!/usr/bin/env bash
# Sync official Postiz into local main, then rebase the custom feature branch.
#
# Remotes (expected):
#   origin → gitroomhq/postiz-app   (official, read-only)
#   fork   → oliverzgy/postiz-app   (your fork, push target)
#
# Usage:
#   ./scripts/sync-upstream.sh
#   ./scripts/sync-upstream.sh --branch feat/postiz-media-library-metadata
#   ./scripts/sync-upstream.sh --push          # also push main + rebased branch to fork
#   ./scripts/sync-upstream.sh --merge         # merge main into feature instead of rebase
#   ./scripts/sync-upstream.sh --dry-run

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-origin}"
FORK_REMOTE="${FORK_REMOTE:-fork}"
MAIN_BRANCH="${MAIN_BRANCH:-main}"
FEATURE_BRANCH="${FEATURE_BRANCH:-feat/postiz-media-library-metadata}"
IMAGE_NAME="${IMAGE_NAME:-postiz-gigglefone}"

DO_PUSH=0
USE_MERGE=0
DRY_RUN=0

usage() {
  cat <<'USAGE'
Sync official Postiz into local main, then rebase the custom feature branch.

Remotes (expected):
  origin → gitroomhq/postiz-app   (official, read-only)
  fork   → oliverzgy/postiz-app   (your fork, push target)

Usage:
  ./scripts/sync-upstream.sh
  ./scripts/sync-upstream.sh --branch feat/postiz-media-library-metadata
  ./scripts/sync-upstream.sh --push          # also push main + rebased branch to fork
  ./scripts/sync-upstream.sh --merge         # merge main into feature instead of rebase
  ./scripts/sync-upstream.sh --dry-run
USAGE
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch)
      FEATURE_BRANCH="$2"
      shift 2
      ;;
    --push)
      DO_PUSH=1
      shift
      ;;
    --merge)
      USE_MERGE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      ;;
  esac
done

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "+ $*"
  else
    echo "+ $*"
    "$@"
  fi
}

require_clean_worktree() {
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "error: working tree is not clean. Commit or stash first." >&2
    git status -sb >&2
    exit 1
  fi
}

require_remote() {
  local remote="$1"
  if ! git remote get-url "$remote" >/dev/null 2>&1; then
    echo "error: remote '$remote' is not configured." >&2
    echo "  git remote add origin git@github.com:gitroomhq/postiz-app.git" >&2
    echo "  git remote add fork   git@github.com:oliverzgy/postiz-app.git" >&2
    exit 1
  fi
}

echo "==> Postiz upstream sync"
echo "    root:     $ROOT"
echo "    upstream: $UPSTREAM_REMOTE/$MAIN_BRANCH"
echo "    fork:     $FORK_REMOTE"
echo "    feature:  $FEATURE_BRANCH"
echo "    mode:     $([[ "$USE_MERGE" -eq 1 ]] && echo merge || echo rebase)"
echo "    push:     $([[ "$DO_PUSH" -eq 1 ]] && echo yes || echo no)"
echo "    dry-run:  $([[ "$DRY_RUN" -eq 1 ]] && echo yes || echo no)"
echo

require_remote "$UPSTREAM_REMOTE"
require_remote "$FORK_REMOTE"

if [[ "$DRY_RUN" -eq 0 ]]; then
  require_clean_worktree
fi

START_REF="$(git rev-parse --abbrev-ref HEAD)"

run git fetch "$UPSTREAM_REMOTE" --tags --prune
run git fetch "$FORK_REMOTE" --tags --prune

# --- update local main to match official ---
run git checkout "$MAIN_BRANCH"

if git rev-parse --verify "$UPSTREAM_REMOTE/$MAIN_BRANCH" >/dev/null 2>&1; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "+ git merge --ff-only $UPSTREAM_REMOTE/$MAIN_BRANCH"
  else
    if ! git merge --ff-only "$UPSTREAM_REMOTE/$MAIN_BRANCH"; then
      echo "ff-only failed; resetting local $MAIN_BRANCH to $UPSTREAM_REMOTE/$MAIN_BRANCH" >&2
      git reset --hard "$UPSTREAM_REMOTE/$MAIN_BRANCH"
    fi
  fi
else
  echo "error: missing $UPSTREAM_REMOTE/$MAIN_BRANCH after fetch" >&2
  exit 1
fi

MAIN_SHA="$(git rev-parse --short "$UPSTREAM_REMOTE/$MAIN_BRANCH" 2>/dev/null || git rev-parse --short HEAD)"
echo "==> $MAIN_BRANCH is now at $MAIN_SHA"

if [[ "$DO_PUSH" -eq 1 ]]; then
  run git push "$FORK_REMOTE" "$MAIN_BRANCH"
fi

# --- bring feature branch onto updated main ---
if ! git show-ref --verify --quiet "refs/heads/$FEATURE_BRANCH"; then
  echo "error: local branch '$FEATURE_BRANCH' does not exist." >&2
  echo "  create it from your fork first, e.g.:" >&2
  echo "  git checkout -b $FEATURE_BRANCH $FORK_REMOTE/$FEATURE_BRANCH" >&2
  exit 1
fi

run git checkout "$FEATURE_BRANCH"

if [[ "$USE_MERGE" -eq 1 ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "+ git merge $MAIN_BRANCH"
  else
    git merge "$MAIN_BRANCH" -m "merge($MAIN_BRANCH): sync official into $FEATURE_BRANCH"
  fi
else
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "+ git rebase $MAIN_BRANCH"
  else
    if ! git rebase "$MAIN_BRANCH"; then
      echo
      echo "error: rebase hit conflicts." >&2
      echo "  1) resolve conflicts" >&2
      echo "  2) git add <files>" >&2
      echo "  3) git rebase --continue" >&2
      echo "  or: git rebase --abort" >&2
      exit 1
    fi
  fi
fi

FEATURE_SHA="$(git rev-parse --short HEAD)"
echo "==> $FEATURE_BRANCH is now at $FEATURE_SHA (onto $MAIN_BRANCH $MAIN_SHA)"

if [[ "$DO_PUSH" -eq 1 ]]; then
  if [[ "$USE_MERGE" -eq 1 ]]; then
    run git push "$FORK_REMOTE" "$FEATURE_BRANCH"
  else
    # rebase rewrites history on the feature branch
    run git push "$FORK_REMOTE" "$FEATURE_BRANCH" --force-with-lease
  fi
fi

# restore previous branch when possible (skip if we ended on it)
if [[ "$START_REF" != "HEAD" && "$START_REF" != "$FEATURE_BRANCH" && "$DRY_RUN" -eq 0 ]]; then
  git checkout "$START_REF" >/dev/null 2>&1 || true
fi

cat <<EOF

==> Sync complete

Next: rebuild & deploy your custom image (pin the tag; do not chase official latest):

  # from repo root
  docker build -f Dockerfile.dev -t ${IMAGE_NAME}:${FEATURE_SHA} .
  docker tag ${IMAGE_NAME}:${FEATURE_SHA} ${IMAGE_NAME}:latest

  # production example (flow.gigglefone.com)
  # scp / docker save|load, then on the host:
  #   cd ~/postiz-docker-compose
  #   # set image: ${IMAGE_NAME}:${FEATURE_SHA}
  #   docker compose up -d postiz

Optional:
  $0 --push                 # push updated main + feature to fork
  $0 --merge                # merge instead of rebase
  $0 --branch <name>        # different feature branch
  UPSTREAM_REMOTE=origin FORK_REMOTE=fork $0

EOF
