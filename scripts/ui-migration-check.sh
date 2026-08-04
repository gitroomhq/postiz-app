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

# Same as `scan`, but joins a call that wraps straight after its opening paren.
# Without this the patterns below only match `useSWR('/x'` written on one line,
# and eighteen real calls in this repo are written across two — so the api list
# was silently short by about 12% and reported "unchanged" for endpoints it had
# never seen. A wrapped call and an inline one are the same call.
#
# It reads comments too, and that is left alone deliberately. Stripping them
# first was tried: one perl pass over 800 files ate a regex literal here and a
# protocol-relative string there, and the i18n list lost eleven real keys while
# claiming to have found a behaviour change. A guard that damages what it counts
# is worse than one that occasionally counts a sentence — so the rule is on the
# writing instead: do not name a gate in prose next to the code that uses it.
scan_calls() {
  find "$SRC" \( -name '*.ts' -o -name '*.tsx' \) -type f -print0 \
    | xargs -0 perl -0777 -pe 's/\(\s*\n\s*/(/g' 2>/dev/null \
    | grep -Eo "$1"
}

collect_api() {
  # Endpoints reached through the custom fetch wrapper and through raw SWR keys.
  # Query strings are stripped: '/posts?week=3' and '/posts?day=1' are one
  # endpoint, and the redesign is expected to keep passing different params.
  #
  # A few SWR *cache keys* land in here too ('/billing-<tier>-<period>'). That is
  # acceptable: this guard detects changes to the set of strings handed to
  # fetch/useSWR, and a cache key changing is also worth being told about.
  {
    scan_calls "fetch\(['\"\`]/[^'\"\`?]*"
    scan_calls "useSWR(Mutation)?\(['\"\`]/[^'\"\`?]*"
  } | sed -E "s/^(fetch|useSWR|useSWRMutation)\(['\"\`]//" \
    | sed -E 's/[[:space:]]+$//' | sed -E 's/\$\{$//' \
    | sed 's#/$##' | grep -v '^$' | sort -u > "$WORK/api.txt"
}

collect_gates() {
  # Which feature gates the frontend still applies.
  #
  # Doc 03 lists about fifteen. They were walked by hand once, in step 8, and
  # nothing has protected them since — a restyle that dropped `tier?.autoPost`
  # would hand every user a paid tab and no list here would have moved, because
  # the api/i18n/routes lists cannot see a condition.
  #
  # Counted, not just named. A gate falling from two call sites to one is the
  # half-removal this is meant to catch, and a set alone would miss it. Benign
  # movement (extracting a shared condition) therefore needs --update and a line
  # in the log, which is the same discipline the other three lists already have.
  #
  # `tier?.x` and `tier.x` collapse to one entry: optional chaining coming or
  # going is not a gate change.
  scan_calls "tier\??\.[a-zA-Z_]+|user\??\.isLifetime|isTrailing|allowTrial|billingEnabled|trialLocked" \
    | sed -E 's/\?\./\./g' \
    | sort | uniq -c | sed -E 's/^ *([0-9]+) +(.*)$/\2 \1/' \
    | sort > "$WORK/gates.txt"
}

collect_i18n() {
  # The key is the first argument of t(); the second is only the English
  # fallback. Copy may be restyled around it, but the key set must not move.
  #
  # `scan_calls`, not `scan`: prettier wraps any t() whose English fallback is
  # long, and a line-at-a-time scan sees none of those. That was 151 keys — 17%
  # of the set — reported as "unchanged" without ever having been read.
  scan_calls "\bt\('[a-zA-Z0-9_.-]+'" \
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
collect_gates

# --- types ------------------------------------------------------------------

# Both apps, because the migration stopped being frontend-only: the tier rename,
# the lifetime route and the provider categories all live in libraries/ and
# apps/backend, and a guard that only compiles the frontend would have waved
# every one of them through.
#
# The backend is checked with `tsconfig.build.json`, which is what it actually
# builds with. Its `tsconfig.json` is stricter than the build and reports seven
# pre-existing errors in files nothing here touches; gating on those would mean
# the check is red before anyone starts.
TYPES_OK=1
for target in "frontend:apps/frontend/tsconfig.json" \
              "backend:apps/backend/tsconfig.build.json"; do
  name="${target%%:*}"
  conf="${target#*:}"
  echo "› types ($name)"
  TYPE_OUT="$WORK/tsc-$name.txt"
  if "$ROOT/node_modules/.bin/tsc" --noEmit -p "$ROOT/$conf" > "$TYPE_OUT" 2>&1; then
    echo "  ok — 0 errors"
  else
    TYPES_OK=0
    echo "  FAIL — tsc reported errors:"
    sed 's/^/    /' "$TYPE_OUT" | head -40
  fi
done

# --- list comparisons -------------------------------------------------------

FAILED=0
[ "$TYPES_OK" -eq 1 ] || FAILED=1

for name in api i18n routes gates; do
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
