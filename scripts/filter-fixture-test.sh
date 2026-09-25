#!/usr/bin/env bash
# review fixture: check-branding's exclusion list must NOT swallow visible prose
# while still excluding internal identifiers.
cd "$(dirname "$0")/.." || exit 1
FIX="$(mktemp)"
trap 'rm -f "$FIX"' EXIT

printf '%s\n' \
  'Install the postiz CLI and Gitroom tools' \
  'npm install -g postiz' \
  'visible Postiz word' \
  'charged_by_postiz":"Am I going to be charged' \
  'id: .postiz.' \
  'getAgent(.postiz.)' \
  'featured_by_gitroom:!1' \
  'postiz://integrations' \
  'x-postiz-org' \
  'POSTIZ_GENERIC_OAUTH' > "$FIX"

# same exclusion logic as scripts/check-branding.sh
INTERNAL='[a-z0-9_/.:@-]postiz|postiz[a-z0-9_/.:@-]'
INTERNAL="$INTERNAL|[a-z0-9_/.:@-]gitroom|gitroom[a-z0-9_/.:@-]"
INTERNAL="$INTERNAL|[\"']postiz[\"']|[\"']gitroom[\"']"
INTERNAL="$INTERNAL|postiz://"
INTERNAL="$INTERNAL|POSTIZ|GITROOM"
INTERNAL="$INTERNAL|LICENSE|NOTICE|Copyright|copyright|AGPL"

echo "--- survives the filter (expect only the 3 visible lines) ---"
grep -vE "$INTERNAL" "$FIX" || true
echo "--- excluded (expect only internal-id lines) ---"
grep -E "$INTERNAL" "$FIX" || true
