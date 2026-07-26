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
- ✅ **Clients module** — `/clients` page (`components/clients/clients.component.tsx` + route + nav in `top.menu.tsx`): real customers list w/ accounts, health, active/total, status, search/filter, expand-to-see-accounts, real "Add Client" (`POST /integrations/customer` → `createCustomer` service+repo, admin-gated). **LIVE**.
- ⏳ **Glass shell** (commit pushed, deploying in background at handoff time) — wide 232px glass sidebar (`layout.component.tsx`) + readable horizontal nav items (`menu-item.tsx`) + glass top bar + theme-aware `--glass-surface/border/hover` tokens. **Verify it's live**: hard-refresh in Dark mode; SSH grep marker `glass-surface`. If the deploy didn't finish, re-run step 2 of the pipeline.

## Design direction (APPROVED by owner — build to this)

Preview artifact (the agreed look): https://claude.ai/code/artifact/0e20c13e-a77f-4be0-80f0-e2ff42f591f7
- **Dark dreamy-glass, Apple-TV restraint** — near-black ground, glassmorphism (translucent + blur), soft dreamy glow, **blue accent, NO purple**. Dark is the default; theme toggle lives in **Settings** (not the sidebar).
- **Sidebar = separate floating glass pieces** (owner's explicit ask): logo alone (mark only; "Mapped Out" text only when expanded) · hamburger alone · the menu in its own floating glass container · Settings alone at the bottom. **Collapsible**: default slim icon-rail, hamburger expands to labels. Icons **centered** when collapsed; each nav icon **unique** (AI = sparkle).
- **No profile in the sidebar** (it's top-right). **No emoji** in greetings.
- Dashboard is content-forward + feature-dense (6 stat cards, Scheduled Today, Connected Accounts w/ health, Top Performing, Campaigns, Audience heatmap, Approvals).

### Shell refinements still PENDING (I shipped a wide glass sidebar, not yet the full spec):
1. Make the sidebar **collapsible** (hamburger toggle) + the **separate floating-pieces** structure (hamburger / menu / settings as distinct glass blocks).
2. Move the theme toggle out of the top bar into **Settings**.
3. Clean remaining **hardcoded purple `#612bd3`** in `components/launches/statistics.tsx`, `platform-analytics/render.analytics.tsx`, `layout/loading.tsx`.
4. Unique nav icons + centered-when-collapsed (per the artifact).

## What's next — module by module (owner's phase order). Each REAL + functional + LIVE.

1. **Accounts** — social accounts page: each account card w/ platform, client, connection status, token health (reuse `Integration.refreshNeeded/disabled`), last-publish, reconnect. Data: `/integrations/list`.
2. **Client Dashboard** (per-client) — overview, accounts, content, campaigns, analytics tabs. Needs some new endpoints.
3. **Calendar + Composer premium pass** — restyle the EXISTING (already-functional) calendar/`new-launch` composer/schedule to the new look. Do NOT rebuild working scheduling/publishing.
4. **Post Library** — folder tree (client→year→month→campaign) over `Post`. New grouping UI; posts already exist.
5. **Media Library** — folders/tags over existing `Media`.
6. **Campaigns** — NEW module (schema `Campaign` additive + API + UI + link posts).
7. **Tasks** — NEW module (schema `Task` additive + API + UI: detail drawer, assignee, comments, reminders).
8. **Analytics + Reports** — extend existing analytics; Reports = export.

## The big INSTAGRAM item (deferred by owner, do NOT touch without go-ahead)
Root cause found (docs/MAPPED_OUT_UPGRADE_AUDIT.md §6): a token-refresh failure sets `Integration.refreshNeeded=true` but not `disabled`, so the account shows "Connected" while the publish workflow silently early-returns (no ERROR). **Owner said: do NOT touch the live Époque Instagram account or do any IG publishing/testing** until he explicitly says so. External social actions on client profiles are prohibited.

## DBU integration — preserve, don't rebuild
DBU System ⇄ DBU Portal ⇄ Mapped Out. Only fix/strengthen sync (outbound is fire-and-forget → durability gap, §8). Contract: `itsmohaji/dbu-group-system/docs/integration/*`. Never bake DBU into the core (keep it an optional module — matters for the future SaaS: same codebase becomes SaaS by enabling signup + Stripe billing + org-per-customer; DBU stays an agency-only add-on).

## Full docs
`docs/MAPPED_OUT_UPGRADE_AUDIT.md` (15-section audit + IG diagnosis + authz inventory), `docs/REFERENCE_REPOSITORY_ASSESSMENT.md`, `docs/MAPPED_OUT_UPGRADE_PROGRESS.md` (journal).
