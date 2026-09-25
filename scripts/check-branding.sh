#!/usr/bin/env bash
# postmonster: verify that no user-visible Postiz/Gitroom branding survives in
# the built frontend or in the email templates.
#
#   sh scripts/check-branding.sh
#
# Scans:
#   * the compiled frontend static output (apps/frontend/.next/static -
#     run `pnpm --filter ./apps/frontend run build` first)
#   * the email template sources (inline HTML produced by the services below)
#
# Method: lowercase /postiz|gitroom/ occurrences are extracted with a small
# context window (so a visible string cannot hide next to an internal
# identifier on the same minified line). Contexts where every occurrence sits
# inside an internal identifier are dropped via the explicit exclusion list
# below. Capitalized brand words are checked separately - internal ids are
# lowercase/snake_case, so any "Postiz"/"Gitroom" is user-visible text and must
# not appear at all. What remains must be empty.
#
# Excluded from the check (internal identifiers / legal files, never shown to
# users as branding):
#   * LICENSE, NOTICE and copyright headers (not scanned at all)
#   * import paths and npm package names: @gitroom/*, @postiz/*, postiz-*
#   * env var names: POSTIZ_*, NEXT_PUBLIC_POSTIZ_*
#   * public API headers: x-postiz-*
#   * mobile deep link scheme: postiz://
#   * JS/agent identifiers: 'postiz', ask_postiz, postiz-store, ui://postiz/*
#   * pricing/payment flags: featured_by_gitroom, gitroom_platform, service: 'gitroom'
#   * i18n keys (snake_case identifiers such as faq_...postiz... are key names,
#     not text - the translated values are rebranded)

set -u

cd "$(dirname "$0")/.."

FRONTEND_OUT="apps/frontend/.next/static"
EMAIL_TEMPLATE_GLOBS=(
  "libraries/nestjs-libraries/src/services"
  "libraries/nestjs-libraries/src/database/prisma/agencies"
  "libraries/nestjs-libraries/src/database/prisma/users"
  "libraries/nestjs-libraries/src/database/prisma/organizations"
  "libraries/nestjs-libraries/src/database/prisma/notifications"
  "libraries/nestjs-libraries/src/emails"
  "libraries/nestjs-libraries/src/newsletter"
  "apps/orchestrator/src/workflows"
  "apps/backend/src/services/auth"
  "apps/backend/src/api/routes/billing.controller.ts"
)

if [ ! -d "$FRONTEND_OUT" ]; then
  echo "check-branding: $FRONTEND_OUT not found - run 'pnpm --filter ./apps/frontend run build' first" >&2
  exit 2
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

collect() {
  grep -rIoE --include='*.js' --include='*.css' --include='*.html' --include='*.ts' \
    '.{0,42}(postiz|gitroom).{0,42}' "$@" 2>/dev/null || true
}

collect "$FRONTEND_OUT" >>"$TMP"
for g in "${EMAIL_TEMPLATE_GLOBS[@]}"; do
  collect $g >>"$TMP"
done

# --- exclusion list: internal identifiers, never user-visible branding -------
# NOTE: case-sensitive on purpose. Internal ids always have another identifier
# character adjacent to the brand word (postiz-frontend, ask_postiz,
# faq_..._postiz, x-postiz-org, postiz.com), while visible prose is a bare
# word ("npm install -g postiz") - and must therefore stay in the results.
INTERNAL='[a-z0-9_/.:@-]postiz|postiz[a-z0-9_/.:@-]'   # embedded in identifier/path
INTERNAL="$INTERNAL|[a-z0-9_/.:@-]gitroom|gitroom[a-z0-9_/.:@-]"
INTERNAL="$INTERNAL|[\"']postiz[\"']|[\"']gitroom[\"']" # quoted agent/metadata ids
INTERNAL="$INTERNAL|postiz://"                          # mobile deep link scheme
INTERNAL="$INTERNAL|POSTIZ|GITROOM"                     # env var names
INTERNAL="$INTERNAL|LICENSE|NOTICE|Copyright|copyright|AGPL"

VISIBLE="$(grep -vE "$INTERNAL" "$TMP" | sort -u || true)"

# Belt and braces: internal ids are lowercase/snake_case, so any capitalized
# brand word is user-visible text and must not appear anywhere.
CAPS="$(grep -rIoE '\b(Postiz|Gitroom)\b' "$FRONTEND_OUT" "${EMAIL_TEMPLATE_GLOBS[@]}" 2>/dev/null | sort -u || true)"

if [ -n "$VISIBLE" ] || [ -n "$CAPS" ]; then
  echo "check-branding: visible /postiz|gitroom/i matches found:" >&2
  echo "$VISIBLE" >&2
  echo "$CAPS" >&2
  exit 1
fi

echo "check-branding: 0 visible occurrences of the upstream brand."
