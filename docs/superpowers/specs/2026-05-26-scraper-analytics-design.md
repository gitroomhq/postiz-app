# D3 Creator — Scraper-Based Analytics Platform (v1 Design)

**Status:** Approved design, awaiting implementation plan
**Date:** 2026-05-26
**Author:** Brainstormed collaboratively with Elston

---

## Overview

D3 Creator is a social-analytics SaaS forked from Postiz. This design replaces the existing developer-API integration with a **login-free, Apify-based scraper approach** so users can track any public social profile by URL alone — no OAuth, no API keys.

**Product shape:** Agency tool + white-label client login portal.
**Hierarchy:** `Agency → Client → Creator → Profile (one per platform per account)`.
**Platforms (v1 build order, one at a time):** Instagram → TikTok → Facebook → RedNote → Douyin.
**Data approach:** "A now, B later" — single generic snapshot table, reports computed on-demand at query time. Pre-computed report engine deferred to v2.

---

## Section 1 — Data model & dashboard UX

### Data model — 5 tables

**1. `client`** — one row per client an agency manages.
Fields: `id`, `agency_id`, `name`, `logo_url`, `created_at`.

**2. `creator`** — one row per real person/account owner. Sits between client and profile.
Fields: `id`, `client_id`, `display_name`, `avatar_url`, `created_at`.

**3. `profile`** — one row per (creator × platform). Multiple accounts on the same platform allowed.
Fields: `id`, `creator_id`, `platform`, `profile_url`, `handle`, `display_name`, `nickname`, `created_at`, `updated_at`, `last_scraped_at`, `scrape_status`.
*No unique constraint on `(creator_id, platform)`.*

**4. `profile_snapshot`** — one row per profile per day (time-series heart of the system).
Fields: `id`, `profile_id`, `captured_at`, `followers`, `following`, `total_posts`, `total_views`, `total_likes`, `raw` (JSONB).

**5. `post_snapshot`** — one row per post per weekly fetch. Last ~30 posts per profile per week.
Fields: `id`, `profile_id`, `external_post_id`, `captured_at`, `posted_at`, `caption_excerpt`, `views`, `likes`, `comments`, `shares`, `media_url`, `raw` (JSONB).

### Supporting tables (defined where they're introduced)

- `scrape_log` — last 30 days of scrape attempts for debugging. Defined in Section 2.
- `user_client_access` — ties `client_viewer` users to one `client_id`. Defined in Section 5.
- `user_agreements` — ToS attestation audit trail (timestamp + IP). Defined in Section 6.

### Why this shape

- **Per-platform view** = filter snapshots by `profile_id`.
- **Per-creator overall view** = join `profile` → `profile_snapshot`, group by `creator_id`.
- **Per-client overall view** = join `creator` → `profile` → `profile_snapshot`, group by `client_id`.
- **Per-agency view** = same chain up to `agency_id`.
- Adding a 6th platform later = no schema change, just a new `platform` value + adapter file.
- **No cross-platform "total followers" column stored** — we compute Total Reach at query time and flag it as approximate in the UI (overlapping audiences caveat).

### Profile-link management rules

| Action | Behavior |
|---|---|
| Add profile to creator | Pick platform → paste URL → optional nickname → save → triggers initial scrape |
| Add multiple accounts on same platform | Allowed. Nickname becomes required when ≥2 profiles exist on the same platform for one creator |
| Edit profile URL | Same `profile.id` preserved → all historical snapshots stay linked → next scrape uses new URL |
| Re-point to a totally different account | Delete + Add New (not Edit) — prevents mixing two accounts' histories |
| Add new platform to existing creator | Same flow as initial add; no re-scrape of other profiles needed |

### Dashboard views

1. **All Creators View** — table of every creator under the agency (or filtered to one client). Sortable columns: total reach, per-platform follower counts, growth rate, engagement rate, views.
2. **Per-Creator Overall View** — one creator, all platforms combined. Stat cards + trend charts.
3. **Per-Platform View** — one creator, one platform. *If creator has multiple accounts on that platform: combined by default with a "Break down by account" toggle.*

### Filters & sorting (all three views)

**Filters:** platform · date range · creator · client
**Sorts:** total followers (summed across platforms) · growth rate (7/30/90-day) · views · engagement rate

### Derived metrics (computed at query time, never stored)

| Metric | Formula |
|---|---|
| Growth % | `(followers_end − followers_start) / followers_start × 100` |
| Engagement % (per platform) | `avg(likes + comments + shares) / followers × 100` over period's posts; missing fields treated as 0 |
| Combined Engagement % (cross-platform) | `sum(all likes + comments + shares across platforms) / sum(all followers across platforms) × 100` |
| Total Reach | `sum(current followers across creator's profiles)` |

### Locked UX rules

- Multi-account per platform = **combined by default, breakdown on toggle.**
- All-Creators followers sort = **summed across platforms** (Total Reach).

---

## Section 2 — Scrape pipeline

### Scheduling engine: existing Temporal orchestrator (`apps/orchestrator`)

No new infra. Temporal handles retries, scheduling, and durability cleanly.

### Two scheduled workflows

**Daily snapshot workflow** — runs every 24h.
- Fetches every active `profile` row.
- Spreads scrapes across a 6-hour window (e.g., 00:00–06:00 UTC).
- Concurrency cap: max 5 parallel Apify runs at any moment (configurable env var).
- For each profile: call `runScraper(platform, profileUrl)` → UPSERT into `profile_snapshot` keyed on `(profile_id, captured_at::date)`.

**Weekly post-level workflow** — runs every Sunday night.
- Same loop, but the adapter returns the last ~30 posts.
- UPSERTs into `post_snapshot` keyed on `(profile_id, external_post_id)`.

### Initial scrape when a profile is added

Async, not blocking. Row created with `scrape_status='pending'` → frontend shows "We'll have your first data in a few minutes" → orchestrator runs scrape within minutes → row updates to `scrape_status='ok'` → dashboard reveals stats (via SWR revalidation).

### The `runScraper(platform, profileUrl)` facade

One entry point, five adapters behind it (`scrapers/instagram.ts`, `scrapers/tiktok.ts`, etc.). Each adapter:
1. Calls its assigned Apify actor with the URL.
2. Parses the actor's output.
3. Returns a normalized `{ profileSnapshot, postSnapshots[] }` shape — regardless of platform.

Adding platform #6 = new adapter file + one line in the dispatch table.

**Implementation order (one platform fully tested before the next):**
1. Instagram
2. TikTok
3. Facebook
4. RedNote
5. Douyin

**Build constraints:**
- Use Apify CLI (`npm install -g apify-cli`) + Apify SDK (`npm install apify-client`).
- Use the best-rated Apify Actor per platform; check Apify Store first.
- Each adapter in its own isolated file.
- Real-URL test per platform must pass before moving to the next.
- API key in env vars, never hardcoded.
- Errors logged loudly — no silent failures.

### Error handling — `scrape_status` values

| Status | Trigger | Action |
|---|---|---|
| `ok` | Successful scrape | Insert snapshot, continue |
| `pending` | Initial scrape queued | Show "syncing" badge in UI |
| `failed` | Transient error (network, Apify timeout) | Retry 3× with exponential backoff (1m, 5m, 15m), then mark `failed` and try again tomorrow |
| `private` | Profile is private / restricted | Stop daily scrapes, alert user: "this profile is private — make it public to track" |
| `not_found` | URL returns 404 / account deleted | Stop scrapes, alert user: "this profile no longer exists — update or remove" |
| `throttled` | Apify returned rate-limit response | Back off, retry next day with smaller batch |
| `handle_changed` | Scrape returned a different handle than expected | Pause, alert user to confirm the profile is still the same account |

Each failed run records the error message in a separate `scrape_log` table for debugging.

**Sanity check:** if a scrape returns dramatically different numbers (e.g., 0 followers when yesterday was 50k), mark `scrape_status='failed'`, alert, and do NOT save the corrupt row.

### 6-month retention cleanup

Nightly job: `DELETE FROM profile_snapshot WHERE captured_at < now() - interval '180 days'`. Same for `post_snapshot`. Cheap, predictable.

### Important caveat: no historical backfill possible

Apify scrapes "now." Day 1 has 1 snapshot. The 6-month report only becomes meaningful after the account has been tracked for 6 months. The UI must say *"Data since [add date] — full historical view available after [add date + 180d]"* rather than pretending we have 6 months of empty data.

### Deferred to v2

- Per-profile custom cadence (some users will want hourly for hot accounts).
- Apify cost tracking per agency for billing.
- Backfill via paid third-party historical-data providers.

---

## Section 3 — Profile-link input UX

**Assumption:** Only agency users add/edit profiles. Client users in the portal are read-only.

### Navigation hierarchy

```
Clients list → Client detail (creators) → Creator detail (profiles) → Profile analytics
```

### Screen 1 — Clients list

Simple table: Logo · Client name · # creators · # profiles · total reach · last activity. Top-right: **`+ Add Client`** → modal with `name` (required) and `logo` (Vercel Blob upload). Click row → Client detail.

### Screen 2 — Client detail (creators)

Header strip: client logo, name, edit button. Grid of creator cards (avatar, name, # profiles shown as platform icons, total reach). Top-right: **`+ Add Creator`** → modal with `display_name` (required) and `avatar`. Click card → Creator detail.

### Screen 3 — Creator detail (profiles)

Header: creator avatar, name, edit button. Table of all profiles:

| Platform | Handle | Nickname | Followers | Status | Last scraped | Actions |
|---|---|---|---|---|---|---|
| 📷 IG | @john_ig | Personal | 12,400 | 🟢 ok | 3h ago | View · Edit · Delete |
| 📷 IG | @john_business | Business | 4,800 | 🟢 ok | 3h ago | View · Edit · Delete |
| 🎵 TikTok | @johntiktok | — | 89k | 🟡 private | 1d ago | View · Edit · Delete |

Top-right: **`+ Add Profile`** → opens Add Profile modal.

### Add Profile modal — three-step wizard

**Step 1 — Paste URL + platform dropdown.**
Single text input with a paired platform dropdown. As user types/pastes URL:
- Auto-detect platform from URL pattern (`instagram.com/*` → IG, `tiktok.com/@*` → TikTok, `facebook.com/*` → FB, `xiaohongshu.com/user/*` → RedNote, `douyin.com/user/*` → Douyin).
- Dropdown pre-fills with detected platform; user can override (safety net for shortened URLs / weird formats).
- Show extracted handle live below: *"Detected: Instagram · @john_ig"*.

**Step 2 — Nickname (conditional).**
Optional in general. **Required** when this creator already has another profile on the detected platform. Helper text: *"You already have an Instagram profile for John. Add a nickname so you can tell them apart."*

**Step 3 — Confirm.**
Summary: "Add @john_ig (Instagram) as 'Personal' to John under Acme Talent Co.?" → user clicks **Save**.

**On save:**
- Row inserted with `scrape_status='pending'`.
- Toast: *"Profile added. We'll have your first data in a few minutes."*
- Modal closes; profile appears in table with 🔄 syncing badge.
- When initial scrape completes (1–5 min), badge flips to 🟢 and followers populate (SWR revalidation).

### Edit Profile modal

Same form, pre-filled. Helper text: *"Editing the URL keeps all historical data linked to this profile. If you're pointing this at a different account entirely, delete this profile and add a new one instead."*

### Delete profile

Confirmation modal: *"Delete @john_ig (Instagram)? This will permanently delete 120 days of historical data for this profile."* Stripe-style typed-name confirmation if profile has >30 days of data.

### Status badges (every list view)

| Status | Badge | Tooltip |
|---|---|---|
| `pending` | 🔄 Syncing | "First scrape in progress — usually 1–5 min" |
| `ok` | 🟢 Active | "Last scraped X ago" |
| `private` | 🟡 Private | "Set this profile to public to resume tracking" |
| `not_found` | 🔴 Not found | "Profile no longer exists — update URL or remove" |
| `failed` | 🟠 Retry pending | "Last scrape failed — will retry tomorrow" |
| `throttled` | ⏸ Paused | "Temporarily paused — will resume tomorrow" |

Badges clickable → opens panel with error log from `scrape_log` table.

### Deferred to v2

- Bulk add via CSV.
- Client self-service profile add.
- Tagging / folders for creators.

---

## Section 4 — Per-creator vs overall analysis

All data computed at query time from `profile_snapshot` and `post_snapshot` (no pre-computation in v1).

### Cross-cutting controls (all three views)

- **Date range selector** — default 30d; options 7d / 30d / 90d / 180d / custom.
- **Platform multi-select filter.**
- **Insufficient-data guards** — growth % hidden for profiles tracked <14 days (tooltip: *"Need 14+ days — check back in N days"*).

### View 1 — All Creators View

**Stat cards (aggregated across filtered creators):**
Total Creators · Total Profiles · Total Reach · Posts in period · Avg Engagement Rate.

**Main table** (one row per creator, sortable on every numeric column):

| Avatar | Creator | Client | Platforms | Total Reach | Δ 30d | Views (30d) | Engagement | Status |

Click row → drills into View 2. Filter sidebar: client, platform, date range, status.

### View 2 — Per-Creator Overall

**Stat cards:** Total Reach (with Δ vs start of period) · Posts in period · Total Views · Combined Engagement Rate · Active Platforms (count + icons).

**Charts:**

| Chart | Type | Data |
|---|---|---|
| Follower growth | Multi-line over time | One line per profile + "Total" line; `profile_snapshot.followers` |
| Views over time | Stacked bar | Stacked by platform; `profile_snapshot.total_views` deltas |
| Engagement by platform | Horizontal bar | Compares each platform's engagement % |

**Top Posts section:** Top 5 posts across all platforms in period. Each card: platform icon · thumbnail · caption excerpt · stats · "View on platform" link out.

### View 3 — Per-Platform

**Combined-by-default + breakdown toggle** for multi-account creators.

**Stat cards:** Followers (current) · Δ 30d · Views (30d) · Engagement % · Posts published in period.

**Charts:**

| Chart | Type | Notes |
|---|---|---|
| Follower growth | Line chart | If multiple accounts: one line per account + "Combined" line when toggle on |
| Posting cadence | Bar chart | Posts per week over period |
| Views per post | Bar chart | Each bar = one post, sorted by date or views |

**Posts table:** All posts in period — thumbnail · caption excerpt · posted at · views · likes · comments · shares · engagement %. Sortable.

### Monthly reports (v1 — on-demand, not pre-computed)

- **"Reports" tab** on every Client page lists past months.
- Clicking a month renders a **print-friendly version of View 2 for each creator under that client**, with date range pre-locked to that calendar month.
- Top of each report: client header (logo, name, month, agency logo).
- **Export to PDF** button on each report.
- Client portal sees same Reports tab (read-only).

**Caveat:** Because reports are on-demand, opening "January 2026" report after July 2026 may show no data (snapshots deleted by 6-month retention). UI banner: *"Reports older than 6 months may be unavailable due to data retention. Export to PDF promptly to keep a permanent copy."*

**v2 (Approach B):** Pre-compute and archive monthly reports as immutable rows the day after month-end → no retention issue, plus auto-email digest to client.

---

## Section 5 — Client portal & white-label

### Auth model — extend Postiz, don't replace

Postiz already has NextAuth + `organizations` table for multi-tenancy.

- **Agency = Organization.**
- **Agency users** = users with role `agency_owner` or `agency_member`. Full access.
- **Client users** = users with role `client_viewer`, **plus** a row in a new `user_client_access` table tying them to ONE specific `client_id`. Scoped, read-only.

```
users ←→ user_org_membership ←→ organizations
                                       ↓
                              user_client_access → clients
                              (only for client_viewer role)
```

### Client invite flow

1. Agency opens Client detail → **`+ Invite Client Viewer`**.
2. Modal: email + display_name + optional message.
3. Save → signed, time-limited invite email sent.
4. Client clicks link → sets password → logs in.
5. Auto-routed to **their** client portal (no client selector).

### Data isolation — service-layer guards

Per CLAUDE.md, all Postiz logic flows Controller → Service → Repository. In the service layer:

- If `agency_owner` / `agency_member`: filter `WHERE agency_id = userContext.agency_id`.
- If `client_viewer`: filter `WHERE client_id = userContext.client_id`.
- If resource doesn't match filter → throw 403. No silent return.

Single helper `assertTenantAccess(userContext, resource)` called at every read. Code review checklist item for every new query.

**v2:** PostgreSQL Row-Level Security (RLS) as defense in depth.

### Client portal scope

| Can do | Cannot do |
|---|---|
| View All Creators (their one client) | See other clients' data |
| View Per-Creator Overall | See agency-side roster |
| View Per-Platform | Add / edit / delete profiles |
| View Reports tab + download PDFs | Add or remove creators |
| Update own password / display name | Invite users · See billing · See agency settings · See Leaderboard for other clients |

Breadcrumbs start at **the client's name**, not the agency. No awareness of D3's multi-tenant structure.

### White-label — L1 at launch

| Tier | URL | Branding | Build cost |
|---|---|---|---|
| **L1 — Branded portal on shared domain** (v1) | `d3-creator.vercel.app/portal/[client-id]` | Agency logo, color, name on every page. Tiny "Powered by D3 Creator" footer | Days |
| **L2 — Subdomain per agency** (v2) | `acmeagency.d3creator.com` | Same + footer hidden | ~1–2 weeks |
| **L3 — Full custom domain** (v3) | `reports.acmeagency.com` | Zero D3 branding | ~2–4 weeks |

**v1 ships L1.** Three branding fields on the agency/organization:
- `logo_url` (Vercel Blob)
- `primary_color` (hex, default `#1D4ED8`)
- `display_name`

Rendered in client portal navbar, button/link accents, and PDF report headers.

---

## Section 6 — Risks & limitations

### High-severity risks

| Risk | What can happen | Mitigation in v1 |
|---|---|---|
| **ToS violation** — IG, FB, TikTok, RedNote prohibit scraping | Apify account suspended; C&D letter; rare lawsuit | Apify absorbs most legal heat; ToS attestation per user; soft profile cap; kill switch |
| **Apify actor breakage** — platforms change pages/anti-bot | Adapter returns empty/wrong data → corrupt snapshots | Sanity check per adapter; daily per-platform success-rate dashboard |
| **GDPR / PDPA exposure** — creators are data subjects on public profiles | Creator could request data deletion | "Delete creator + all snapshots" admin action; documented in privacy policy; honor within 30 days |
| **Apify cost spike** — pricing/billing changes, or one client adds 200 profiles | Surprise 5–10× bill | Account-level cost cap; per-agency profile limit (free = 100); daily cost monitoring email |

### Medium-severity risks

| Risk | What can happen | Mitigation |
|---|---|---|
| **Data accuracy gaps** — stale caches, bot views, follower fluctuations | User confusion, support burden | "Why might this differ?" tooltip on every stat; onboarding expectations |
| **Missing historical data** — no backfill | Brand-new profiles look empty for weeks; reports older than 6 months disappear | "Tracking since X" badge; PDF export reminder banner |
| **Platform-side detection** — rare flagging of high-traffic profiles | Temporary throttling | Staggered scrape times; max 1×/day per profile |
| **Profile changes mid-tracking** — handle change, account migration | Wrong account's data flows into a `profile.id` | `handle_changed` status: alert user to confirm |

### Low-severity but worth knowing

| Risk | What it means |
|---|---|
| No private/DM/audience demographic data | Anything requiring login is impossible. "Audience demographics" = API-only, can't deliver |
| No Stories/Reels ephemeral content | Stories vanish in 24h; weekly scrape misses them |
| Chinese platform fragility — RedNote/Douyin | Fewer mature actors, may need China-IP proxies, encoding issues. Why they're #4 and #5 in build order |
| Defensibility — data layer isn't the moat | Competitors can replicate scraping. Moat = UI, workflow, white-label, agency relationships |

### Operational hygiene from day one

- **Per-platform success-rate dashboard** (D3 admin only). Daily % of scrapes ending in `ok` vs failure states. Spot a broken actor within hours.
- **Scrape kill switch** — single env var `SCRAPING_ENABLED=false` halts daily/weekly workflows in seconds.
- **`scrape_log` table** — last 30 days of detailed scrape outcomes for debugging.
- **Incident log doc** at `docs/operations/incidents.md` — note every breakage and resolution.

### Launch posture (locked)

**Quiet launch + user agreement.**
- Ship at modest volume.
- ToS requires user to attest they have rights/authorization to track the profiles they add.
- Attestation stored in `user_agreements` table with timestamp + IP.
- Soft cap at 100 profiles per agency on free tier; expandable on request.
- `SCRAPING_ENABLED` kill switch ready before launch.

---

## Section 7 — End-to-end user journey

Concrete scenario: **Sarah** (agency owner) onboards her first client **Acme Talent Co.**, adds creator **John** with 3 platforms, invites client viewer **Alex**.

### Day 0 — Agency onboarding (first 30 minutes)

| Time | Step | Behind the scenes |
|---|---|---|
| 0:00 | Sarah signs up at `d3-creator.vercel.app/signup` | `user` row + `organization` row created |
| 0:02 | Onboarding wizard: agency name, logo, primary color, ToS | Logo → Vercel Blob; `user_agreements` row written with timestamp + IP |
| 0:05 | Empty dashboard with "Add your first client" CTA | — |
| 0:07 | `+ Add Client` → "Acme Talent Co." | `client` row created |
| 0:10 | On Acme detail → `+ Add Creator` → "John Doe" | `creator` row created |
| 0:13 | On John's detail → `+ Add Profile` → paste `instagram.com/john_ig` | Auto-detects Instagram. `profile` row with `scrape_status='pending'` |
| 0:14 | Toast: *"We'll have your first data in a few minutes"* | Temporal orchestrator picks up pending profile within next scrape cycle (1–5 min) |
| 0:18 | Page auto-refreshes (SWR): 🔄 → 🟢, followers populate | `runScraper('instagram', url)` → Apify actor → adapter normalizes → `profile_snapshot` + 30× `post_snapshot` rows inserted |
| 0:20 | Sarah clicks "View Analytics" — Per-Platform View loads | Stat cards show current numbers; charts say *"Tracking since today — check back tomorrow"* |
| 0:25 | Sarah adds TikTok and Facebook profiles for John | Each scrapes within minutes; Per-Creator Overall View now shows 3 platforms |
| 0:30 | Sarah hits `+ Invite Client Viewer` → enters Alex's email | Signed-link invite sent; `user_client_access` row pre-created |

### Day 0 — Client onboarding (Alex, 5 minutes)

| Time | Step | Behind the scenes |
|---|---|---|
| +5 min | Alex receives invite, clicks link | Signed token verified; "set password" page |
| +6 min | Sets password → logs in | `user` row claims pre-created `user_client_access` row |
| +7 min | Lands on client portal — scoped to Acme Talent only | Service-layer guard enforces `client_id = Acme`. Breadcrumbs start at "Acme Talent" |
| +8 min | Sees All Creators view (John, 3 platforms, current numbers) | Same data Sarah sees, read-only and locked to Acme |
| +10 min | Reports tab → empty | UI: *"Your first monthly report will be available on [1st of next month]"* |

### Days 1–14 — Background accumulation

- Daily workflow runs nightly (00:00–06:00 UTC, staggered).
- Weekly workflow runs Sundays.
- Charts: single dots → multi-point lines as days accumulate.
- 30-day growth % stays hidden until Day 14 (insufficient-data guard).

### Day 14+ — First real insights

- Per-Creator Overall View shows meaningful growth lines.
- All Creators View becomes useful once 3+ creators exist.

### Day 30 — First monthly report

- 1st of next month, Reports tab on Acme's page shows new entry.
- Click → on-demand render (per-creator overviews + charts locked to calendar month + Acme branding + agency logo footer).
- Sarah reviews, clicks **Export to PDF**, sends to Alex (or leaves it in portal).
- Alex logs in, sees report in Reports tab, downloads PDF.

### Days 30+ — Steady state

- Sarah onboards more clients/creators using same flow.
- Each month, new report entry appears automatically.
- Sarah monitors D3-admin success-rate dashboard.
- Day 180+: oldest snapshots drop off via retention cleanup; banner reminds users to export PDFs.

### The full lifecycle in one sentence

**Sarah signs up → adds client → adds creator → adds profile URLs → Apify scrapes within minutes → invites client → both see live analytics → after 14 days, growth metrics meaningful → on the 1st of each month, fresh monthly report appears → after 180 days, archived PDFs become long-term record.**

---

## Section 8 — Leaderboard tab

### Placement & scoping

- New top-level dashboard tab: **Leaderboard** (alongside All Creators / Reports).
- **Agency users:** scoped to entire agency (all clients, all creators).
- **Client users:** scoped to their one client only.
- Service-layer tenant guard from Section 5 handles scoping.

### Sub-tabs

Three sub-tabs within Leaderboard: **Videos · Creators · Platforms**.

### Video Rankings (data: `post_snapshot`)

| # | Ranking | Notes |
|---|---|---|
| 1 | Most viewed video overall | `MAX(views)` in period |
| 2 | Most viewed video this week / month | Same, period-scoped |
| 3 | Most liked video | — |
| 4 | Most commented video | — |
| 5 | Most shared video | Facebook & RedNote have no native shares → those platforms' videos excluded with tooltip *"Shares not available on this platform"* |
| 6 | **Biggest view jump week-over-week** | Reframed from "fastest growing 24h" since we only have weekly post data. UI label: "Week-over-week view growth" |

### Creator Rankings (data: `profile_snapshot` + `post_snapshot`)

| # | Ranking | Notes |
|---|---|---|
| 1 | Most followers overall | Total Reach (sum across creator's profiles) |
| 2 | Highest follower growth (daily) | Day-over-day delta sum across profiles |
| 3 | Highest follower growth (monthly) | 30-day window |
| 4 | Most total views | Sum `total_views` deltas across period |
| 5 | Best engagement rate | `(likes + comments + shares) / followers × 100` — same formula as Section 4 |
| 6 | Most consistent poster | Highest posting frequency in period (posts/week) |

### Platform Rankings

| # | Ranking | Notes |
|---|---|---|
| 1 | Best performing platform per creator | Default: views. Small dropdown `[views \| growth \| engagement]` |
| 2 | Which platform drives the most views overall | Sum views per platform across all in-scope profiles |

### Filter / sort / period system

- **Period presets:** Daily · Weekly · Monthly · Custom (date picker).
- **"Change vs previous period":** Previous period = same-length window immediately before the selected one.
- **Filters:** platform multi-select · creator multi-select · client multi-select (agency role only).
- **Sort:** every numeric column sortable, ascending/descending toggle.
- **Auto-refresh:** filter/period change triggers re-query (SWR pattern).

### UI structure

**Each leaderboard row:**

| Rank | Avatar/Thumbnail | Name/Caption | Platform | Metric | Change |
|---|---|---|---|---|---|
| 🥇 1 | 👤 John | — | 📷 IG | 105.2k | ▲ 2 |
| 🥈 2 | 👤 Jane | — | 🎵 TikTok | 89.4k | — |
| 🥉 3 | 👤 Maya | — | 📷 IG | 76.1k | ▼ 1 |
| 4 | 👤 Alex | — | 📘 FB | 42.8k | new |

- Top 3 get gold/silver/bronze rank badges + subtle row tint.
- Change indicator: ▲N / ▼N / "new" / "—".
- Click row → drills into Per-Creator Overall View (or post detail for video rankings).

**Mobile pattern:** Below 768px, table collapses into stacked cards. Rank badge + thumbnail + name on row 1; metric + change indicator on row 2.

### Implementation note (heads-up for build)

Every leaderboard ranking requires running the same query twice (current + previous period) for rank-change computation. ~14 rankings → ~28 queries per page load. Fine for v1 scale (<100 creators per agency). At 1,000+ creators, add a `leaderboard_cache` table refreshed nightly (part of future Approach B work).

---

## Open items / deferred to v2+

| Item | Section | Why deferred |
|---|---|---|
| Pre-computed report engine (Approach B) | 2, 4 | Lean v1 — compute on-demand first, optimize when we know report shapes |
| Per-profile custom scrape cadence (hourly for hot accounts) | 2 | Cost/complexity; v1 = daily only |
| Apify cost tracking per agency for billing | 2 | v1 = flat soft cap |
| Backfill via paid historical-data providers | 2 | Out of scope for v1 |
| Bulk add profiles via CSV | 3 | URL detection + nickname logic gets fiddly |
| Client self-service profile add | 3 | Conflicts with read-only client portal model |
| Creator tagging / folders | 3 | Easy to add later via `tag` column or join table |
| L2 white-label (subdomain per agency) | 5 | Wildcard DNS + tenant routing; ~1–2 weeks work; sell as paid tier |
| L3 white-label (full custom domain) | 5 | Per-tenant SSL + edge routing; ~2–4 weeks; Enterprise tier |
| PostgreSQL Row-Level Security (RLS) | 5 | Defense in depth; v1 = service-layer guards only |
| Auto-email monthly report digest | 4 | Requires pre-computed reports (Approach B) |
| Daily post-level scraping (unlocks true 24h spike rankings) | 8 | ~30× Apify cost; v1.5 paid feature |
| `leaderboard_cache` table for large agencies | 8 | Only needed at 1,000+ creators per agency |
| Pricing tiers & paid plans (free vs paid, billing integration) | 1, 6 | Spec assumes a soft 100-profile cap on a "free tier" but the actual pricing model, paid tiers, and billing integration are out of v1 scope. Worth designing before public launch |

---

## Locked decisions reference

| Decision | Value | Section |
|---|---|---|
| Tracking scope | Agency-style (Agency → Clients → Creators → Profiles) | 1 |
| Report audience | Agency + clients via login portal | 5 |
| v1 platforms (build order) | IG → TikTok → FB → RedNote → Douyin, one at a time | 2 |
| Scrape depth | Daily profile snapshot + weekly post-level (~30 posts) | 2 |
| Data approach | A now (lean snapshot), B later (pre-computed reports) | 1, 4 |
| Multi-account per platform UI | Combined by default + breakdown toggle | 1 |
| All-Creators followers sort | Summed across platforms (Total Reach) | 1 |
| Platform dropdown in Add Profile | Auto-filled, user-overridable | 3 |
| White-label tier at launch | L1 — Branded portal on shared domain | 5 |
| ToS posture | Quiet launch + user agreement attestation | 6 |
| Engagement formula | `(likes + comments + shares) / followers × 100` everywhere | 4, 8 |
| "Fastest growing video" handling | Reframed to week-over-week view jump | 8 |
| "Most consistent poster" definition | Highest posting frequency in period | 8 |

---

**End of design. Implementation plan to follow.**
