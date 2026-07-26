# Mapped Out — Handoff for the next session

> Read this first. It's the single source of truth for continuing the upgrade.
> When the owner says "go on", continue from **What's next**, module by module.
> **Hard rule from the owner (non-negotiable):** everything shipped is the REAL,
> functional app — every button/card/filter works against live data. **No mockups,
> no demos, no fake numbers.** Each module: schema → API → UI → wired → build-verified
> → deployed to social.mappedout.co → owner reviews → next.

---

## Where things live (critical)

- **App code = the FORK, cloned locally at `/Users/mohamedhaji/Desktop/postiz-app`.**
  Work branch: **`mappedout-upgrade`**. Production branch: **`mappedout-branding`**.
  (The dir the owner opens, `~/Desktop/Postiz`, is the INFRA repo — no app code there.)
- **Deploy pipeline (proven, reusable):**
  1. `git checkout mappedout-branding && git merge --ff-only mappedout-upgrade && git push origin mappedout-branding` → GH Actions `mappedout-build.yml` builds `ghcr.io/itsmohaji/postiz-app:mappedout` (~10–12 min).
  2. Trigger Coolify redeploy: `curl -H "Authorization: Bearer $TOKEN" 'https://coolify.dbugroup.net/api/v1/deploy?uuid=pu53f10y6ml47hc3t88mdrs7&force=false'` → poll `/api/v1/deployments/<uuid>` until `finished`.
  3. Verify: `curl -sSL https://social.mappedout.co` = 200; backend `curl .../api/public/v1/groups` = 401.
- **Coolify API token:** in macOS Keychain — `security find-generic-password -s mappedout-coolify -a deploy -w`. Scopes: read + deploy. (The old token in `.claude/settings.local.json` is REVOKED/401 — don't use it.)
- **VPS SSH (read logs / DB / verify container):** `ssh -i ~/.ssh/claude_ed25519 root@187.127.100.103`. Find the app container: `docker ps --filter name=postiz --format '{{.Names}}' | grep -viE 'postgres|redis'`. DB: `docker exec <c> printenv POSTGRES_USER/DB` then `psql`.
- **Verify a deploy actually landed** (avoids "it's cached" confusion): SSH → `docker exec <container> sh -lc 'grep -rl "<marker>" /app/apps/frontend/.next | head'` (e.g. marker `glass-surface`, or a token hex). Owner must **hard-refresh / private window**.
- **Env constraints:** cannot render the Next.js app locally → verify by `pnpm run build:frontend` (compiles) + owner's live review. Schema deploys via `prisma db push --accept-data-loss` on every boot → **additive/nullable only**. No `timeout` cmd on macOS. Shell-safety classifier can briefly go down — retry.

## Live state (as of this handoff, 2026-07-26)

- ✅ **Phase 0** (audit) + **Phase 2** (auth: per-client IDOR fix on posts by-id + group routes; 3-role model `SUPER_ADMIN`/`AGENCY_ADMIN`/`ACCOUNT_MANAGER` via **Option B** = keep the Prisma enum `SUPERADMIN/ADMIN/USER/CLIENT`, map on top; team-management gated `@OrgRoles(SUPERADMIN,ADMIN)`; 22 security unit tests) — **LIVE**.
- ✅ **Phase 1 theme** — dark blue-glass tokens (`colors.scss` `.dark`/`.light` `--new-*`: killed purple `#612bd3`→`#5c9ad6`, grounds→`#0a0c11`), dreamy body gradient (`global.scss`), real Mapped Out logo (already in `logo.tsx`) — **LIVE**.
- ✅ **Clients module** — `/clients` page (`components/clients/clients.component.tsx` + route + nav in `top.menu.tsx`): real customers list w/ accounts, health, active/total, status, search/filter, real "Add Client" (`POST /integrations/customer` → `createCustomer` service+repo, admin-gated). Rows now NAVIGATE to the per-client dashboard (inline expand removed). **LIVE**.
- ✅ **Glass shell** — wide 232px glass sidebar (`layout.component.tsx`) + horizontal nav items (`menu-item.tsx`) + glass top bar + theme-aware `--glass-surface/border/hover` tokens — **LIVE** (verified in container, marker `glass-surface`). NOTE: this is the WIDE glass sidebar, NOT yet the full "separate floating pieces / collapsible" spec — that refinement is still pending (see Honest Visual Scope §1 below).
- ✅ **Accounts module** (session 2026-07-26) — `/accounts` (`components/accounts/accounts.component.tsx` + route + nav): every connected channel as a card w/ platform-logo overlay, owning client, connection health (active / reconnect / finish-setup / disabled) and **last publish**. New additive endpoint `GET /integrations/last-published` (repo `getLastPublishedDates` groupBy PUBLISHED posts + service; scoped like `/list`, no schema change). Real actions: **Reconnect** (`GET /integrations/social/:identifier?refresh=:internalId` → redirect), **Assign/Unassign client** (`PUT /integrations/:id/customer-name`), **Enable/Disable** (`POST /integrations/enable|disable`). Search + status filters + summary counts. **LIVE** (commit `ef2c1ada`; verified route + marker + endpoint→401 in container). ⚠️ Reconnect/Disable are wired but were NOT exercised against the live Époque IG (owner rule).
- ✅ **Client Dashboard** (session 2026-07-26) — per-client `/clients/[id]` (`components/clients/client-dashboard.component.tsx` + `clients/[id]/page.tsx`; Clients rows navigate here). 4 tabs, all real data via EXISTING endpoints (no schema change): **Overview** (active/total accounts, scheduled/published/attention stats, next scheduled post, connected-accounts summary, recent activity), **Accounts** (client's channels + health + real Reconnect), **Content** (`GET /posts/list?customer=<id>&state=scheduled|published|draft` → `expandPostsList`; All/Scheduled/Published/Drafts filter), **Analytics** — (a) DB-derived volume (published-per-6-months bar, published-by-channel, counts) AND (b) **REAL live per-channel platform metrics** (followers/reach/impressions/engagement) via `GET /analytics/:integration?date=` (channel chips + 7/30/90d, load-on-demand, sparkline + trend, handles `available:false`). **LIVE** (dashboard commit `f2564ef7`; analytics upgrade commit `7f778bb4`; markers verified in container). Live metrics are **READ-ONLY** (never post/delete) → safe per the clarified client-account rule; the owner explicitly cleared analytics reads. **One deliberate omission:** the **Campaigns tab** is left out until the Campaigns module (#6) exists — no fake tab.
- ✅ **Calendar + Composer restyle (pass 1)** (session 2026-07-26, commit `621cfd75`) — **the glass is now REAL.** ROOT CAUSE fixed: `glass-surface` was only CSS TOKENS (`--glass-*` in colors.scss), never a class, so every `glass-surface` className (incl. my Accounts/Dashboard cards) rendered NO glass. Defined the actual **`.glass-surface`** utility in `global.scss` (background `var(--glass-surface)` + `1px var(--glass-border)` + `backdrop-filter: blur(22px) saturate(140%)`, `!important` to beat stacked Tailwind `bg-*`/`border-*`). Now Accounts, Client Dashboard, calendar headers + composer are genuinely glassy. Applied: calendar **day/week/month header cells → glass** (`calendar.tsx`), **post pills → soft elevation + hover-lift + rounded**, **shared composer/modal frame** (`new-launch/modal.wrapper.component.tsx`) → glass + depth shadow + bolder title. **Surface-only — no layout/drag/handler/scheduling changes.** Verified `.glass-surface{…backdrop-filter:blur(22px)…}` in the LIVE container CSS. **STILL PENDING (pass 2):** composer INTERNALS (`manage.modal.tsx` body + `editor.tsx`) still stock; calendar **toolbar** (`filters.tsx`) not yet glassed; making the **dreamy body gradient visible behind the two `bg-newBgColorInner` panels** (Honest-Scope §2) not done (that's a layout-risk change — do carefully).

## Design direction (APPROVED by owner — build to this)

Preview artifact (the agreed look): https://claude.ai/code/artifact/0e20c13e-a77f-4be0-80f0-e2ff42f591f7
- **Dark dreamy-glass, Apple-TV restraint** — near-black ground, glassmorphism (translucent + blur), soft dreamy glow, **blue accent, NO purple**. Dark is the default; theme toggle lives in **Settings** (not the sidebar).
- **Sidebar = separate floating glass pieces** (owner's explicit ask): logo alone (mark only; "Mapped Out" text only when expanded) · hamburger alone · the menu in its own floating glass container · Settings alone at the bottom. **Collapsible**: default slim icon-rail, hamburger expands to labels. Icons **centered** when collapsed; each nav icon **unique** (AI = sparkle).
- **No profile in the sidebar** (it's top-right). **No emoji** in greetings.
- Dashboard is content-forward + feature-dense (6 stat cards, Scheduled Today, Connected Accounts w/ health, Top Performing, Campaigns, Audience heatmap, Approvals).

### ⚠️ HONEST VISUAL SCOPE — read this, it's the crux of the owner's frustration
So far only **tokens (colors) + the sidebar** were changed. Verified live: the served CSS DOES have
`#0a0c11`/`#5c9ad6`/`glass-surface` — the theme deployed. BUT the app still "looks like the old one"
because **the bespoke demo look ≠ reskinned Postiz**. Every page/card/table/panel still uses Postiz's
ORIGINAL component styling. Making it look like the artifact
(https://claude.ai/code/artifact/0e20c13e-a77f-4be0-80f0-e2ff42f591f7) is a **systematic surface-by-surface
restyle**, NOT a token swap. Do NOT keep tweaking tokens and calling it transformed — the owner sees through it.

**The real restyle plan (do this deliberately next session):**
1. **Shell, properly** — the sidebar as **separate floating glass pieces** (logo / hamburger / menu / settings),
   **collapsible** (default icon-rail → hamburger expands), centered icons when collapsed, unique nav icons
   (AI=sparkle), theme toggle moved to **Settings**, no profile in sidebar. (Owner's exact spec + artifact.)
2. **Make the dreamy background actually VISIBLE** — right now it's on `body` but the content wrapper
   (`bg-newBgLineColor`) covers it and the glows are too faint over near-black. Strengthen the glows and/or
   make the content wrapper translucent so depth shows. This is a big part of the "wow" that's currently invisible.
3. **Glass the content surfaces** — the panels/cards/tables inside pages (Postiz components) need the glass
   treatment (translucent + blur + `--glass-border`), restyled page by page as each module is built.
4. Clean remaining hardcoded purple `#612bd3` in `components/launches/statistics.tsx`,
   `platform-analytics/render.analytics.tsx`, `layout/loading.tsx` (the `--color-forth` button purple + light
   focus tokens are already fixed).

Set expectations with the owner: the app becomes the demo **progressively** (shell first, then each page),
not in one deploy. Best approach: do a focused "shell + dreamy-bg + one flagship page" deploy so he SEES a
real transformation on at least one screen, then roll the same treatment across pages as modules ship.

## What's next — module by module (owner's phase order). Each REAL + functional + LIVE.

1. ✅ **Accounts** — DONE + LIVE (see Live state above).
2. ✅ **Client Dashboard** — DONE + LIVE (see Live state; Campaigns tab deferred to module #6; analytics is DB-derived, IG-safe).
3. ✅ **Calendar + Composer premium pass (pass 1)** — DONE + LIVE (real `.glass-surface`, calendar headers/pills, composer frame). Pass 2 (composer internals, toolbar, dreamy-bg-behind-panels) still pending — see Live state.
4. ✅ **Post Library** — DONE + LIVE (`/post-library`, commit `e5b6dab1`): `components/library/post-library.component.tsx` + route + nav. Pick a client → lazy-fetch its full history (published paginated + scheduled + draft merged via `/posts/list`+`expandPostsList`; `state=all` is future-only so published fetched separately) → **Client → Year → Month** folder tree w/ counts + per-folder post list + search; post click → `/p/:id` preview. No schema change. NOTE: click-to-EDIT uses the calendar (editPost needs `useCalendar` context); library click opens preview instead — fine for browse. Groups per-client (posts carry no customer field).
5. **Media Library** — folders/tags over existing `Media`. **← NEXT (owner says "go on")**
6. **Campaigns** — NEW module (schema `Campaign` additive + API + UI + link posts).
7. **Tasks** — NEW module (schema `Task` additive + API + UI: detail drawer, assignee, comments, reminders).
8. **Analytics + Reports** — extend existing analytics; Reports = export.

## The big INSTAGRAM item (deferred by owner, do NOT touch without go-ahead)
Root cause found (docs/MAPPED_OUT_UPGRADE_AUDIT.md §6): a token-refresh failure sets `Integration.refreshNeeded=true` but not `disabled`, so the account shows "Connected" while the publish workflow silently early-returns (no ERROR).

**CLARIFIED RULE (owner, 2026-07-26):** the prohibition is specifically about **NOT accidentally POSTING or DELETING** on a CLIENT's account (e.g. Époque IG). **Reads are FINE** — pulling analytics / followers / impressions / post history does not post or delete, so it's allowed on client accounts (incl. the live-provider `/analytics/:integration` endpoints + OAuth token refresh they do). **DBU Group is the owner's OWN account → free to use/test.** So: never trigger publish/delete on a client channel by mistake; read-only actions (analytics, lists) are OK; test write flows only on DBU Group. (This supersedes the earlier "do no IG anything" note — that was over-cautious.)

## Social connect (OAuth) failures — ROOT CAUSE (proven 2026-07-26, commit `c98effa1`)
Symptom: "LinkedIn (and sometimes Instagram) won't connect" even with correct client-id/secret/redirect.
**Proven via the container nginx access log** — LinkedIn's authorize-step redirect returned
`error=unauthorized_scope_error&error_description=Scope "w_organization_social" is not authorized for your
application`. LinkedIn rejects the ENTIRE auth request if ANY requested scope isn't approved for the app, so
no `code` is issued → the `/api/integrations/social-connect/:p` callback POSTs with `error` → 400 →
`authenticate()`/`checkScopes` never even run (that's why provider-level logging showed nothing).
**Root cause:** the providers hard-code elevated, approval-gated scopes.
- **Personal `linkedin`** was requesting org scopes (`rw_organization_admin`/`w_organization_social`/
  `r_organization_social`) + `r_basicprofile` it does NOT need → **CODE FIX shipped**: reduced to
  `['openid','profile','w_member_social']` (self-serve "Sign In w/ OIDC" + "Share on LinkedIn"). Personal
  LinkedIn now connects with NO special approval. (`checkScopes` uses the same set, so it stays consistent.)
- **`linkedin-page`** genuinely needs the org scopes → requires the LinkedIn **"Community Management API"**
  product to be approved on the app (owner action; dropped `r_basicprofile` so CMA is the only approval).
- **`instagram`** scopes (`business_management`/`instagram_content_publish`/`instagram_manage_insights`/…)
  need Meta **App Review / Advanced Access**, or the connecting FB user must be an app **tester/admin** (why
  it "sometimes" works). Left unchanged — they're required for IG features; the fix is approval/tester, not code.
**DEBUG TECHNIQUE that worked (reuse):** provider `authenticate()` logging is useless for authorize-step
rejections (they never reach it). Read the **container nginx access log** instead:
`docker exec <postiz> tail -300 /var/log/nginx/access.log | grep -iE "social/|social-connect"` — the
`?error=...&error_description=...` on the callback redirect is LinkedIn/Meta telling you the exact reason.

## DBU integration — preserve, don't rebuild
DBU System ⇄ DBU Portal ⇄ Mapped Out. Only fix/strengthen sync (outbound is fire-and-forget → durability gap, §8). Contract: `itsmohaji/dbu-group-system/docs/integration/*`. Never bake DBU into the core (keep it an optional module — matters for the future SaaS: same codebase becomes SaaS by enabling signup + Stripe billing + org-per-customer; DBU stays an agency-only add-on).

## Full docs
`docs/MAPPED_OUT_UPGRADE_AUDIT.md` (15-section audit + IG diagnosis + authz inventory), `docs/REFERENCE_REPOSITORY_ASSESSMENT.md`, `docs/MAPPED_OUT_UPGRADE_PROGRESS.md` (journal).
