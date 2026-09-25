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
# Method: every /postiz|gitroom/i occurrence is extracted with a small context
# window (so a visible string cannot hide next to an internal identifier on the
# same minified line). Contexts that consist only of internal identifiers are
# dropped via the explicit exclusion list below. What remains must be empty -
# those would be strings a user can read.
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
INTERNAL='@gitroom|@postiz'                        # import paths / npm scopes
INTERNAL="$INTERNAL|[A-Za-z0-9_-]+postiz[A-Za-z0-9_-]+"  # postiz inside a longer token
INTERNAL="$INTERNAL|postiz[A-Za-z0-9_-]{2,}"       # postiz-frontend, postiz_*, ...
INTERNAL="$INTERNAL|[A-Za-z0-9_-]{2,}postiz"       # x-postiz-org, ask_postiz, ...
INTERNAL="$INTERNAL|[A-Za-z0-9_-]+gitroom[A-Za-z0-9_-]+"
INTERNAL="$INTERNAL|gitroom[A-Za-z0-9_-]{2,}"
INTERNAL="$INTERNAL|[A-Za-z0-9_-]{2,}gitroom"
INTERNAL="$INTERNAL|postiz://"                     # mobile deep link scheme
INTERNAL="$INTERNAL|postiz\.com"                   # upstream domain in comments
INTERNAL="$INTERNAL|gitroomhq"                     # upstream GitHub org
INTERNAL="$INTERNAL|com\.postiz\.mob"              # example product id
INTERNAL="$INTERNAL|[\"']postiz[\"']"              # JS agent id (getAgent('postiz'))
INTERNAL="$INTERNAL|[\"']gitroom[\"']"             # Stripe metadata marker, i18n key
INTERNAL="$INTERNAL|POSTIZ"                        # env var names
INTERNAL="$INTERNAL|LICENSE|NOTICE|Copyright|copyright|AGPL"

VISIBLE="$(grep -viE "$INTERNAL" "$TMP" | sort -u || true)"

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
