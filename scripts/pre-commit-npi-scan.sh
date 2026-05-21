#!/bin/bash
# roc-ai pre-commit NPI scanner
# Ported from mortgagearchitect-ai/scripts/pre-commit-npi-scan.sh 2026-05-21 per Phase 2 Task A

#
# Blocks commits that include obvious borrower NPI:
#   - 9-digit SSN patterns (loose: 3-2-4 with or without dashes) — HARD BLOCK
#   - CCM loan numbers (10-12 digit numeric IDs) — WARN (false-positive prone)
#   - Name + dollar amount > $200K paired in same line — WARN (heuristic)
#
# Wired via .husky/pre-commit. Bypass with `git commit --no-verify` (do NOT
# routinely bypass — per CLAUDE.md NPI/PII rule).

set -u

RED=$'\033[31m'
YEL=$'\033[33m'
RST=$'\033[0m'

SSN_RE='\b[0-9]{3}-?[0-9]{2}-?[0-9]{4}\b'
LOAN_RE='\b[0-9]{10,12}\b'
DOLLAR_RE='\$\s?[2-9][0-9]{2},?[0-9]{3}|\$\s?[1-9][0-9]{6,}'

# Get staged diff (additions only), excluding the scanner itself (which contains
# example SSN-shaped patterns in comments) and the husky hook that invokes it.
# --diff-filter=ACMR: include Added, Copied, Modified, Renamed (not Deleted) —
# previously --diff-filter=AM let a renamed-while-added SSN bypass the scanner.
# Override scan target via NPI_SCAN_TARGET (e.g. "origin/main...HEAD" for pre-push).
SCAN_TARGET="${NPI_SCAN_TARGET:---cached}"
if ! DIFF=$(git diff $SCAN_TARGET --diff-filter=ACMR --unified=0 \
  -- ':(exclude)scripts/pre-commit-npi-scan.sh' ':(exclude).husky/pre-commit' 2>&1); then
  echo "${RED}NPI scan: git diff failed for target '$SCAN_TARGET' — refusing to silent-pass:${RST}" >&2
  echo "$DIFF" | head -3 >&2
  exit 2
fi
if [ -z "$DIFF" ]; then
  exit 0
fi

ADDED=$(echo "$DIFF" | grep -E '^\+[^+]' | sed 's/^+//')
if [ -z "$ADDED" ]; then
  exit 0
fi

VIOLATIONS=0

ssn_hits=$(echo "$ADDED" | grep -nE "$SSN_RE" || true)
if [ -n "$ssn_hits" ]; then
  echo "${RED}NPI: SSN pattern detected in commit:${RST}"
  echo "$ssn_hits" | head -5
  VIOLATIONS=$((VIOLATIONS+1))
fi

# Loan-number warn (NOT block) — strip out YYYYMMDD-like dates first
loan_hits=$(echo "$ADDED" | grep -nE "$LOAN_RE" | grep -vE '\b(20[0-9]{2})[01][0-9][0-3][0-9]\b' || true)
if [ -n "$loan_hits" ]; then
  echo "${YEL}NPI: Possible CCM loan number (10-12 digits) — verify it's not NPI:${RST}"
  echo "$loan_hits" | head -5
  echo "${YEL}  If this IS a loan number, pseudonymize (e.g., 'Loan K' instead).${RST}"
fi

# Name + $200K+ warn (NOT block) — only flag if a capitalized word is on the same line
big_dollar=$(echo "$ADDED" | grep -nE "$DOLLAR_RE" | grep -vE '^[0-9]+:#|^[0-9]+:\|' | grep -E '[A-Z][a-z]{3,}' || true)
if [ -n "$big_dollar" ]; then
  echo "${YEL}NPI: Possible borrower-name + dollar pairing (>= \$200K) — pseudonymize if it identifies a real borrower:${RST}"
  echo "$big_dollar" | head -3
fi

if [ "$VIOLATIONS" -gt 0 ]; then
  echo
  echo "${RED}Commit BLOCKED — fix NPI violations above, or use --no-verify for genuine non-NPI numeric content.${RST}"
  echo "Reference: CLAUDE.md NPI/PII rule"
  exit 1
fi

exit 0
