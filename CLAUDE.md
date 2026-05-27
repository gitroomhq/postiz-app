# D3 Creator

Login-free social analytics. Agency tool + white-label client portal. Scraper-based — no OAuth, no platform APIs.

**Hierarchy:** Agency → Client → Creator → Profile (one per platform per account).
**Platforms (v1 build order):** Instagram → TikTok → Facebook → RedNote → Douyin.
**Spec:** [docs/superpowers/specs/2026-05-26-scraper-analytics-design.md](docs/superpowers/specs/2026-05-26-scraper-analytics-design.md)

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js App Router (React 19) + Tailwind 3 |
| Database | Supabase Postgres + Storage |
| Scrapers | Apify (official pre-built actors only) |
| Hosting | Vercel (frontend + functions + cron) |
| Scheduling | Vercel Cron — NOT Temporal |
| Package mgr | pnpm only |

Note: spec mentions Temporal (`apps/orchestrator`) — that was Postiz architecture. Deleted. Scheduling is now Vercel Cron.

## Layout

```
apps/frontend/                              Next.js app
  src/app/(public)/                         Public routes (home, dashboard, leaderboard, creators)
  src/components/{ui,layout,*-showcase}/    Components
libraries/react-shared-libraries/src/translation/   i18n only
supabase/                                   Migrations (CLI-managed, created Task 2)
docs/superpowers/specs/                     Design docs
```

## UI work — read first

**Before writing any UI, read `DESIGN.md`.** Brand colors, typography, spacing — all live there. Match exactly; deviations need approval.

Tailwind 3. Before writing component check:
- `apps/frontend/src/app/colors.scss`
- `apps/frontend/src/app/global.scss`
- `apps/frontend/tailwind.config.cjs`

`--color-custom*` deprecated — don't use.

UI components live in `apps/frontend/src/components/ui/`. Check existing ones first for design language.

## Data layer

- Migrations via Supabase CLI. No manual schema in dashboard.
- Tables (v1 minimal MVP — Plan-wins-over-spec):
  - `client` — one per agency client
  - `creator` — one per influencer
  - `profile` — one per (creator × platform)
  - `profile_snapshot` — daily snapshot, time-series
  - `post_snapshot` — per-post snapshot
- Per spec also: `scrape_log`, `user_client_access`, `user_agreements` — deferred per user decision.
- No `agency` table in v1 — deferred per user decision.

## Scraper layer

- One adapter file per platform in `libraries/scrapers/` (created Task 4).
- Use ONLY official Apify Actors — never build custom Actors.
- `APIFY_API_KEY` from env, never hardcoded.
- Daily cron loops active profiles, calls correct adapter, UPSERTs into `profile_snapshot` + `post_snapshot`.
- Skip duplicates: `(profile_id, captured_at::date)` for profile, `(profile_id, external_post_id, captured_at::date)` for posts.

## Frontend rules

- SWR for data fetching. Each `useSWR` in its own hook. Comply with `react-hooks/rules-of-hooks`. Never `eslint-disable-next-line`.
- Lint runs only from root.
- Production system — don't break existing users, migration may be needed.

## Behavioral guidelines

### Think before coding
- State assumptions. Uncertain → ask.
- Multiple interpretations → present them.
- Simpler approach exists → say so, push back.

### Simplicity first
- No features beyond asked.
- No abstractions for single-use.
- No unrequested flexibility.

### Surgical changes
- Touch only what task needs.
- Match existing style.
- Notice unrelated dead code → mention, don't delete.
- Remove imports/vars YOUR changes orphaned.

### Goal-driven
- "Add validation" → "Write test for invalid input, then make pass."
- Multi-step → brief plan, verify each step.

## Memory note

Prior memory said "TanStack migration in progress" — **disregard**. Migration branch deleted as failure (2026-05-27). Frontend stays on Next.js App Router. Postiz scaffolding stripped — see commit `eeb77d18` for clean baseline.
