<!--
This repository is SocialStream's AGPL-3.0 fork of Postiz. We don't accept
external pull requests — see CONTRIBUTING.md.

If you're SocialStream's maintainer pushing a modification, fill in the
sections below.
-->

## Summary

What changed and why. Link to the GSD plan or upstream commit if relevant.

## Modification scope

- [ ] Every touched upstream file has a `// Modified by SocialStream on YYYY-MM-DD` marker
- [ ] No customer-facing surface introduces or restores a "Postiz" mention (with the carve-out for `license-footer.tsx`'s AGPL § 5 attribution)
- [ ] `LICENSE` was not modified
- [ ] If this PR bumps the pinned upstream tag, `apps/frontend/src/app/(app)/source/route.ts` and `agpl-drift-check.yml` still resolve correctly

## Verification

- [ ] `pnpm install && pnpm run build` clean
- [ ] Local Docker compose runs (`docker-compose.dev.yaml`) — login renders, `/source` redirects, `/health` returns 200
- [ ] Visual brand check (header logo, page title, transactional email styling)

## Linked artifacts

- GSD plan / phase: …
- Upstream issue or PR (if mirroring fix): …
