#!/usr/bin/env bash
# Idempotent Postiz -> PostQueen brand sweep. Re-run after every upstream merge.
#
# NOT covered by this script (manual checklist after upstream merges):
#   - libraries/react-shared-libraries/src/helpers/testomonials.tsx (keep emptied/PostQueen-only quotes)
#   - apps/frontend/src/app/(app)/(preview)/p/[id]/page.tsx (upstream draws "postiz" via SVG paths)
#   - .github/PULL_REQUEST_TEMPLATE.md (keep CLA-free version), CCLA.md/ICLA.md/FUNDING.yaml/sonar (keep deleted)
#   - logo components (new-layout/logo.tsx, ui/logo-text.component.tsx) + public/ and extension icons
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Checks run BEFORE any substitution.
#
# These are functional identifiers, not branding. The Stripe tag decides whether
# a webhook event is processed at all: if a merge reintroduces the upstream
# literal while the webhook expects ours, subscription events are dropped and
# nothing errors. Assert rather than substitute — if upstream restructures this,
# stop and let a human look instead of rewriting code we no longer recognise.
if grep -q "service: 'gitroom'" libraries/nestjs-libraries/src/services/stripe.service.ts; then
  echo "ERROR: upstream reintroduced the literal Stripe service tag." >&2
  echo "       Restore SUBSCRIPTION_SERVICE_TAG in stripe.service.ts before deploying," >&2
  echo "       or subscription webhooks will be silently ignored." >&2
  exit 1
fi
# Source only: dist/ and .next/ hold stale compiled copies that would trip this
# on every run without meaning anything.
if grep -rq "featured_by_gitroom" apps libraries \
     --include='*.ts' --include='*.tsx' \
     --exclude-dir=dist --exclude-dir=.next --exclude-dir=node_modules; then
  echo "ERROR: upstream reintroduced featured_by_gitroom; rename it to 'featured'." >&2
  exit 1
fi

# Text files under git, minus protected paths.
FILES=$(git ls-files -- . \
  ':!README.md' ':!CHANGELOG.md' ':!LICENSE' \
  ':!pnpm-lock.yaml' \
  ':!libraries/postqueen-wallets/**' \
  ':!scripts/rebrand.sh' \
  ':!apps/frontend/public/**' ':!apps/extension/public/**' \
  | while IFS= read -r f; do [ -f "$f" ] && grep -Iq . "$f" 2>/dev/null && printf '%s\n' "$f"; done)

run() { printf '%s\n' "$FILES" | tr '\n' '\0' | xargs -0 perl -pi -e "$1"; }

# 1. Repo slugs (most specific first).
run 's/gitroomhq\/postiz-app/GkhanKINAY\/postqueen-app/g'
run 's/gitroomhq\/postiz-agent/GkhanKINAY\/postqueen-agent/g'
run 's/gitroomhq\/postiz-docker-compose/GkhanKINAY\/postqueen-docker-compose/g'
run 's/gitroomhq_postiz-app/GkhanKINAY_postqueen-app/g'

# 2. Emails before the generic domain rule.
run 's/nevo\@postiz\.com/support\@postqueen.ai/g'
run 's/\@postiz\.com/\@postqueen.ai/g'

# 3. Domains, subdomain-preserving (api./docs./platform./affiliate./contribute./discord. etc).
run 's/((?:[a-z0-9-]+\.)*)postiz\.com/${1}postqueen.ai/g'

# 4. Env vars and remaining all-caps.
run 's/POSTIZ_/POSTQUEEN_/g'
run 's/POSTIZ/POSTQUEEN/g'

# 5. Brand words — TitleCase before lowercase.
run 's/Postiz/PostQueen/g'
run 's/postiz/postqueen/g'

# 6. Transliterated brand names (he "פוסטיז", bn "পোস্টিজ").
printf '%s\n' "$FILES" | tr '\n' '\0' | xargs -0 perl -CSD -pi -e 's/\N{U+05E4}\N{U+05D5}\N{U+05E1}\N{U+05D8}\N{U+05D9}\N{U+05D6}/PostQueen/g; s/\N{U+09AA}\N{U+09CB}\N{U+09B8}\N{U+09CD}\N{U+099F}\N{U+09BF}\N{U+099C}/PostQueen/g'

# 7. Targeted Gitroom fixes ONLY — never replace lowercase "gitroom" generically (@gitroom/* aliases).
perl -pi -e 's/"name": "gitroom"/"name": "postqueen"/' package.json
perl -pi -e 's/\x{00A9} 2024 Your Gitroom Limited All rights reserved\./\x{00A9} 2026 PostQueen. All rights reserved./; s/&copy; 2024 Your Gitroom Limited All rights reserved\./&copy; 2026 PostQueen. All rights reserved./' \
  libraries/nestjs-libraries/src/database/prisma/agencies/agencies.service.ts

echo "Rebrand sweep complete."
