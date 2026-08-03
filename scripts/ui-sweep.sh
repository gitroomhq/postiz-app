#!/usr/bin/env bash
#
# Responsive sweep: every screen this install can render, three widths, both
# themes. The output that matters is the ⚠ lines — ui-shot.mjs compares
# scrollWidth against clientWidth, so horizontal overflow is reported rather
# than eyeballed.
#
#   scripts/ui-sweep.sh [output-dir]
#
# Needs a session cookie in PQ_AUTH. Without one every screen redirects to the
# login page and the sweep silently photographs that instead — which is why
# ui-shot reports the redirect rather than writing a green-looking file.
#
# This lived in a scratch directory for most of the migration and covered seven
# screens. It missed `channels` — a page added *during* the migration — and both
# billing screens, so every "zero overflow" it printed was a statement about
# half the app. Keeping it in the repo is how the list stops drifting from the
# route table.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/docs/ui-shots/sweep}"
BASE="${PQ_BASE:-http://localhost:4200}"
WIDTHS="${PQ_WIDTHS:-420,900,1440}"

if [ -z "${PQ_AUTH:-}" ]; then
  echo "PQ_AUTH is not set — every screen would be the login page. Aborting." >&2
  exit 2
fi

mkdir -p "$OUT"

# Screens that render for an ordinary signed-in account.
SCREENS=(
  launches
  analytics
  media
  plugs
  third-party
  settings
  agents
  channels
  billing
  billing/lifetime
)

for screen in "${SCREENS[@]}"; do
  echo "=== $screen ==="
  node "$ROOT/scripts/ui-shot.mjs" \
    --url "$BASE/$screen" \
    --out "$OUT/${screen//\//-}" \
    --width "$WIDTHS" --theme both
done

# The auth screens are the opposite case: the middleware bounces a signed-in
# visitor away from /auth, so they can only be photographed without a session.
for screen in auth auth/login auth/forgot; do
  echo "=== $screen (no session) ==="
  PQ_AUTH= node "$ROOT/scripts/ui-shot.mjs" \
    --url "$BASE/$screen" \
    --out "$OUT/${screen//\//-}" \
    --width "$WIDTHS" --theme both
done

# Not swept, and each for a reason rather than an oversight:
#
#   /p/[id]            needs a published post to point at
#   /oauth/authorize   needs a real client_id and redirect_uri
#   /admin/stats       superadmin only; this account is not one, so it would
#   /admin/errors      photograph a redirect and call it a screen
#
# They are listed here so the gap is visible in the same place as the coverage.
echo
echo "Swept ${#SCREENS[@]} signed-in screens + 3 auth screens. Four skipped — see the comment above."
