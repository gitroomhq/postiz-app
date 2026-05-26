# Prod Smoketest + Dev Pre-warm

**Date:** 2026-05-26
**Status:** Approved (brainstorming phase)
**Owner:** D3 Creator perf work

## Context

After landing a full Lamborghini UI rebuild, real-Chrome perf testing surfaced:

- Dev cold-compile penalty: 14.3s TTFB on first hit to `/`, ~500ms-1s on subsequent uncompiled routes
- Dev bundle (unminified): `main-app.js` = 12 MB, `main.js` = 7.1 MB
- Lighthouse on dev: 3.1 MB gzipped wire payload, 330ms render-blocking, forced reflow, "minify JS — 260 KB savings" (which auto-resolves in prod)

User asked: pick the highest-compound fix. Brainstorming concluded **A) production smoketest + B) dev pre-warm script** is the right pair today. **Defer C) Node 22 + Turbopack swap** until A returns numbers — that decision changes meaning depending on whether prod is actually slow.

## Goal

1. Answer empirically: **is the redesigned app slow in production, or only in dev?**
2. Remove the worst dev pain (first-click cold compile) with a 10-min script, no Node version change required.

Out of scope: bundle-analyzer deep dive, Node 22 swap, Turbopack stability evaluation, code-splitting refactor beyond what's already shipped.

## A — Production smoketest

### What

Compile the frontend with `next build`, serve via `next start`, measure with the same /browse perf tool used in dev testing. Capture a comparable before/after.

### Steps

1. **Build** — `pnpm --filter ./apps/frontend run build`
   - Expected duration: 3-5 min on this monorepo
   - Sentry sourcemap upload included; `next.config.js` already has `errorHandler` that swallows Sentry upload failures non-fatally
   - If `SENTRY_AUTH_TOKEN` is missing, the build still succeeds (upload skipped)

2. **Serve** — `pnpm --filter ./apps/frontend run start`
   - Same port 4200
   - Note: dev server must be stopped first (port conflict)

3. **Measure** — drive /browse against:
   - `/` (landing)
   - `/auth/login`
   - `/dashboard`
   - `/launches`
   - Capture per route: TTFB, DOM parse, DOM ready, total load, network payload (sum of all resource sizes), console errors

4. **Output** — write findings to `docs/perf/2026-05-26-prod-smoketest.md`:
   - Table: route × (dev TTFB, prod TTFB, dev DOM-ready, prod DOM-ready, dev payload, prod payload)
   - Console errors per route (if any)
   - Quick verdict: prod-ready or red-flag?

### Risks

- Build may fail on missing env vars beyond Sentry (Stripe `STRIPE_PUBLISHABLE_KEY`, Postgres `DATABASE_URL`, etc.). Mitigation: build with the same `.env` the dev server uses; the build only reads `process.env.*` for client-exposed `NEXT_PUBLIC_*` vars and Sentry config.
- Sentry sourcemap upload could trigger network call to Sentry servers. Mitigation: already handled by next.config errorHandler.
- Long build delays user feedback. Mitigation: documented up-front (3-5 min expected).

### Success criteria

- Build completes with exit 0
- `next start` serves all 4 test routes with 200 status
- Perf table populated for all 4 routes
- Doc committed to `docs/perf/`

## B — Pre-warm script

### What

Small Node script that fetches a configured list of routes once `next dev` is ready. The cold compile happens BEFORE the user's first click, not on it.

### File

`apps/frontend/scripts/prewarm.mjs` (new, ~30 lines, ESM)

### Behavior

1. Poll `http://localhost:4200/` every 500ms with a 60s timeout, until response status is 200
2. Once ready, sequentially `fetch()` each route in the list:
   - `/`
   - `/auth/login`
   - `/launches`
   - `/analytics`
   - `/settings`
3. Per-route logging: `[prewarm] /auth/login → 200 in 1432ms`
4. Final summary: `[prewarm] Done. 5/5 routes warmed in 8.2s`
5. Exit 0 (or 1 if any route failed)

### Wiring

- Add to `apps/frontend/package.json` scripts:
  ```json
  "prewarm": "node scripts/prewarm.mjs"
  ```
- **Not** auto-spawned alongside `next dev`. Reason: spawning together via `concurrently` makes the boot perception worse (15s of cold-compile chatter on startup) and ties pre-warm to every dev run. Manual invocation in a second terminal preserves the choice.
- Usage: `pnpm --filter ./apps/frontend run prewarm` after `pnpm dev:frontend`

### Risks

- Routes requiring auth will compile but render redirect/error pages — that still warms the route's compile path, which is the goal
- Adds ~5-10s of perceived "stuff happening" after dev boots — acceptable trade since user runs it knowingly
- If a route hangs (proxy timeout, DB unreachable), prewarm hangs with it. Mitigation: per-fetch 30s timeout, log fail, continue to next route

### Success criteria

- Script committed and `pnpm prewarm` runs end-to-end without exception
- First user click to any pre-warmed route returns sub-second (matching the warm numbers from dev testing: ~200-300ms DOM ready)

## Implementation order

1. B first (10 min) — script is self-contained, no build, no service swap. Immediately useful.
2. A second (~10 min running + waiting for build) — depends on stopping dev server; do after B is committed so the dev workflow improvement is locked in.
3. Findings doc written after A completes.

## What we'll know at the end

- A definitive answer to "is prod slow?" — drives whether we follow with code-splitting work or move on
- A repeatable pre-warm command for everyone on the team
- Numbers to compare against if/when we later try Node 22 + Turbopack (approach C, deferred)
