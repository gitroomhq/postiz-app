# Roadmap — Cadence Retrofit Milestone

Source: `/Users/storex/.claude/plans/i-want-you-to-fizzy-wind.md` (briefing locked 2026-05-14).

## Phase 1 — Audit & Inventory (current)
Hybrid: static code inventory of every route + live walkthrough of top 5–8 surfaces. Output: `apps/frontend/APP-AUDIT.md` with route table, copy-violations list, missing-screens list, ordered Cadence pain index.

**Gate:** Mark reviews APP-AUDIT.md before Phase 2 starts.

## Phase 2 — Design + Copy (waves, one PR each)

| Wave | PR | Scope |
|------|----|-------|
| 2.0 | #1 | Token foundation — Cadence CSS, font swap, `content/en.ts`, `components/Icon.tsx`, optional `/__preview` routes. No screen-level changes. |
| 2.1 | #2 | Global chrome — top bar, sidebar, mobile nav, AGPL footer, command-palette trigger, toast system, workspace switcher, trial banner |
| 2.2 | #3 | Auth + onboarding — login screen, 3-step wizard, channel-connect wizard |
| 2.3 | #4 | Composer + scheduling — single-post composer, bulk launcher, schedule modal |
| 2.4 | #5 | Calendar + queue — week/month grid, queue list view, filter bar |
| 2.5 | #6 | Analytics — KPI tiles, charts, per-post drawer |
| 2.6 | #7 | Settings + billing — settings shell, all sections, billing tier comparison |
| 2.7 | #8 | Approvals + collaboration — approval queue, comments, roles |
| 2.8 | #9 | Public boards + webhooks + API |

Each wave runs through `/gsd:execute-phase`. Polish rounds between waves run through `/gsd:fast`.

## Phase 3 — Professional polish (folded into Wave 2.1 + later waves)

Command palette (⌘K), empty states, audit log, keyboard shortcuts overlay, skeleton loaders, toasts, in-app changelog, workspace switcher, trial countdown, error states, AGPL `/source` link, help drawer.

## Phase 4 — Production rollout

1. Merge waves 2.0 → 2.8 to `main` of `socialstream-postiz` one at a time
2. Each merge triggers Hetzner VPS Docker image rebuild + redeploy
3. Smoke-test at `app.socialstream.be` after each wave
4. AGPL public-fork cadence verified (30-day rule)
5. Brand-guard E2E extended to crawl authenticated app surface
6. `/gsd:ui-review` on the app surface (target ≥22/24 PASS, parity with marketing-site)
7. Announce on `/changelog` page

**Kill criterion:** if a wave breaks scheduling on the VPS, roll back the container tag, file a bug, fix in a new wave — never hot-patch on `main`.

## Out of scope (deferred)

- NL/FR translations of the app (Phase B, after 5 paying pilots)
- Dark mode (separate phase; tokens already defined)
- New features beyond Postiz upstream
- Marketing site changes (already in production)
- Mobile native app
