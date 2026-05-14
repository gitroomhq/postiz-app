# State — Cadence Retrofit

**Last updated:** 2026-05-14 (Phase 1 kickoff)

## Current phase

**Phase 1 — Audit & Inventory** ✅ complete 2026-05-14. Awaits Mark's review before Phase 2.

## What just happened

- 2026-05-14 — `.planning/` initialized in app repo (worktree `youthful-visvesvaraya-ee1441`)
- Read 8 critical files (briefing, CLAUDE.md, HANDOFF.md, README.md, colors_and_type.css, STRATEGY.md, site/src/components/, apps/frontend/src/, memory pointers)
- Static code pass: 25 routes inventoried; Cadence violations across 11 categories collected
- Live walkthrough: 4 unauth surfaces captured (login, register, forgot, activate). Screenshots at worktree root.
- `apps/frontend/APP-AUDIT.md` shipped — 14kb audit doc with route table, violations, copy fixes, missing surfaces, pain index, Wave 2.0 entry-point checklist
- Resume note saved: `/Users/storex/.claude/projects/.../memory/project_resume_app_2026-05-14.md`

## Decisions locked 2026-05-14

15-row decision table at end of `apps/frontend/APP-AUDIT.md`. Highlights:
- Hotfix PR before Wave 2.0, scope expanded to: 6 in-app /legal/* pages + Wallet removal + Plausible domain + kill /billing/lifetime + hide /agents + /plugs + kill (extension) route group + asset rename postiz.svg→socialstream.svg
- Wave 2.0: alias legacy tokens via tailwind.config.cjs + sweep dead customColor*; light-only; create content/en.ts skeleton + Icon.tsx
- Test account on production created by Mark BEFORE Wave 2.0 starts

## What's next

1. ✅ Phase 1 audit committed + PR opened (this turn)
2. Scope the bundled hotfix PR file-by-file, bring back to Mark for sign-off
3. **Mark action:** create test account on production
4. Live walkthrough of 21 authenticated surfaces, append captures to APP-AUDIT.md
5. Wave 2.0 token foundation PR via `/gsd:execute-phase`

## Repo facts (worth remembering)

- Worktree path: `.claude/worktrees/youthful-visvesvaraya-ee1441/`
- Branch: `claude/youthful-visvesvaraya-ee1441` (off `main`)
- App lives at `apps/frontend/` (Next.js 13+ App Router, port 4200 dev)
- 25 page.tsx files across `(app)`, `(provider)`, `(extension)` route groups
- Tailwind config: `apps/frontend/tailwind.config.cjs` — has 55+ `customColor*` tokens + `--new-*` family + per-platform brand colors
- Font family currently: `Helvetica Neue` (must swap to Inter Tight)
- `license-footer.tsx` already exists at `apps/frontend/src/components/license-footer.tsx`
- Most recent rebrand commits: PRs #4–9 (legacy SocialStream blue brand, NOT Cadence)
