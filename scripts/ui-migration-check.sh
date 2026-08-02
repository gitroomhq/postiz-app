#!/usr/bin/env bash
#
# UI migration guard.
#
# The redesign changes how the frontend looks, not what it does. These four
# checks are the evidence for that claim: they capture the app's observable
# contract as sorted text files and fail when a restyle quietly moves it.
#
#   types   — the frontend still compiles
#   api     — the same set of backend endpoints is still called
#   i18n    — no translation key was dropped, none was invented
#   routes  — no page appeared or disappeared
#
# Usage:
#   scripts/ui-migration-check.sh                 compare against the baseline
#   scripts/ui-migration-check.sh --update        rewrite the baseline
#
# Use --update only when a step is *meant* to change one of these lists (step 4
# adds /channels, for example). Say so in docs/ui-migration-log.md when you do:
# an unexplained baseline update is the one way this guard can be defeated.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/apps/frontend/src"
BASE="$ROOT/docs/ui-migration-baseline"
UPDATE=0
[ "${1:-}" = "--update" ] && UPDATE=1

mkdir -p "$BASE"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Plain grep, not ripgrep: this has to run on a bare checkout and in CI.
scan() { grep -rEoh --include='*.ts' --include='*.tsx' "$1" "$SRC" 2>/dev/null; }

# --- collectors -------------------------------------------------------------
# Each writes a sorted, deduplicated list to $WORK/<name>.txt.

collect_api() {
  # Endpoints reached through the custom fetch wrapper and through raw SWR keys.
  # Query strings are stripped: '/posts?week=3' and '/posts?day=1' are one
  # endpoint, and the redesign is expected to keep passing different params.
  {
    scan "fetch\(['\"\`]/[^'\"\`?]*"
    scan "useSWR(Mutation)?\(['\"\`]/[^'\"\`?]*"
  } | sed -E "s/^(fetch|useSWR|useSWRMutation)\(['\"\`]//" \
    | sed 's#/$##' | grep -v '^$' | sort -u > "$WORK/api.txt"
}

collect_i18n() {
  # The key is the first argument of t(); the second is only the English
  # fallback. Copy may be restyled around it, but the key set must not move.
  scan "\bt\('[a-zA-Z0-9_.-]+'" \
    | sed -E "s/^t\('//; s/'$//" \
    | sort -u > "$WORK/i18n.txt"
}

collect_routes() {
  find "$ROOT/apps/frontend/src/app" -name 'page.tsx' 2>/dev/null \
    | sed "s#^$ROOT/apps/frontend/src/app##" \
    | sort > "$WORK/routes.txt"
}

collect_api
collect_i18n
collect_routes

# --- types ------------------------------------------------------------------

echo "› types"
TYPE_OUT="$WORK/tsc.txt"
if "$ROOT/node_modules/.bin/tsc" --noEmit -p "$ROOT/apps/frontend/tsconfig.json" > "$TYPE_OUT" 2>&1; then
  TYPES_OK=1
  echo "  ok — 0 errors"
else
  TYPES_OK=0
  echo "  FAIL — tsc reported errors:"
  sed 's/^/    /' "$TYPE_OUT" | head -40
fi

# --- list comparisons -------------------------------------------------------

FAILED=0
[ "$TYPES_OK" -eq 1 ] || FAILED=1

for name in api i18n routes; do
  current="$WORK/$name.txt"
  baseline="$BASE/$name.txt"
  count="$(wc -l < "$current" | tr -d ' ')"

  if [ "$UPDATE" -eq 1 ] || [ ! -f "$baseline" ]; then
    cp "$current" "$baseline"
    echo "› $name"
    echo "  baseline written — $count entries"
    continue
  fi

  echo "› $name"
  if diff -q "$baseline" "$current" >/dev/null; then
    echo "  ok — $count entries, unchanged"
  else
    FAILED=1
    echo "  FAIL — the set changed:"
    diff "$baseline" "$current" | grep -E '^[<>]' | sed 's/^</    removed: /; s/^>/    added:   /'
    echo "  If this is intentional for this step, rerun with --update and say why in the log."
  fi
done

echo
if [ "$FAILED" -eq 0 ]; then
  echo "PASS — behaviour surface unchanged."
else
  echo "FAIL — see above."
fi
exit "$FAILED"
