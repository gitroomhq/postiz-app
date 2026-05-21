#!/usr/bin/env bash
# Local validation for the Phase 1 CI/CD gates.
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

FAILED=0

run() {
  echo
  echo "▶ $1"
  shift
  if "$@"; then
    echo "  ✓ pass"
  else
    echo "  ✗ FAIL"
    FAILED=1
  fi
}

# 1. actionlint (download if missing — drop into ./.bin to avoid PATH conflicts)
mkdir -p .bin
if [ ! -x .bin/actionlint ]; then
  echo "(installing actionlint into .bin/)"
  (cd .bin && bash <(curl -fsSL https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash) >/dev/null)
fi
run "actionlint" .bin/actionlint -color

# 2. NPI scan — check EACH commit in the push range, not just the aggregate diff.
# Pre-commit hook already covers `git diff --cached`; this validator runs
# pre-push. Aggregate `git diff $BASE...HEAD` only shows the NET state, so a
# commit that adds NPI followed by a later commit that removes it would
# silently pass — but the pushed history still contains the SSN forever.
# Iterating per-commit catches "introduce then remove before push" bypasses.
PUSH_BASE="${NPI_SCAN_BASE:-origin/main}"
git fetch --quiet origin main 2>/dev/null || true
if git rev-parse --verify "$PUSH_BASE" >/dev/null 2>&1; then
  COMMITS=$(git rev-list --reverse "$PUSH_BASE..HEAD")
  if [ -z "$COMMITS" ]; then
    echo
    echo "▶ NPI scan (push range)"
    echo "  (no commits ahead of $PUSH_BASE — nothing to scan)"
  else
    NPI_FAILED=0
    for c in $COMMITS; do
      short=$(git rev-parse --short "$c")
      if ! env NPI_SCAN_TARGET="$c~..$c" bash scripts/pre-commit-npi-scan.sh; then
        echo "  ✗ NPI scan FAILED on commit $short"
        NPI_FAILED=1
        break
      fi
    done
    if [ "$NPI_FAILED" = "1" ]; then
      FAILED=1
      echo "▶ NPI scan (per-commit, push range $PUSH_BASE..HEAD)"
      echo "  ✗ FAIL"
    else
      echo
      echo "▶ NPI scan (per-commit, push range $PUSH_BASE..HEAD)"
      echo "  ✓ pass ($(echo "$COMMITS" | wc -l) commit(s) clean)"
    fi
  fi
else
  # Fall back to staged-diff check if push base can't be resolved (offline, fresh clone)
  run "NPI scan (staged diff fallback)" bash scripts/pre-commit-npi-scan.sh
fi

# 3. gitleaks (working tree) — optional locally
if command -v gitleaks >/dev/null 2>&1; then
  run "gitleaks" gitleaks detect --no-banner --redact
else
  echo
  echo "▶ gitleaks"
  echo "  (gitleaks not installed locally — skipping; CI will catch)"
fi

# 4. TypeScript check — only run if this package exposes a check script.
if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.check ? 0 : 1)"; then
  run "pnpm check" pnpm check
else
  echo
  echo "▶ pnpm check"
  echo "  (no check script in package.json — skipping)"
fi

# 5. Tests — DELIBERATELY SKIPPED in roc-publisher (Phase 2 Task B.1 follow-up).
# `pnpm test` invokes `jest --coverage` but jest.config.ts requires `@nx/jest`
# which is not installed in this monorepo's root. Audit (2026-05-20) also
# found 0 test files in the repo. Restore this step after:
#   - @nx/jest installed (or jest config switched off Nx)
#   - Test files added
# Until then, skipping cleanly so the validator's "Safe to push" signal stays honest.
echo
echo "▶ tests"
echo "  (skipped — see comment in scripts/cicd/local-validate.sh; Phase 2 Task B.1 follow-up)"

# Summary
echo
if [ "$FAILED" = "1" ]; then
  echo "❌ One or more checks failed. Fix before pushing."
  exit 1
fi
echo "✅ All local CI/CD gates pass. Safe to push."
