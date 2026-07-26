# Theme visual polish + Dashboard home — design

**Date:** 2026-07-26
**Status:** Approved by owner (scope: visual polish + new Dashboard as home)
**Repo:** fork `itsmohaji/postiz-app`, branch `mappedout-upgrade` → `mappedout-branding`.

## Goal
Deliver the visible "dreamy glass" transformation on a flagship screen and make the
premium Dashboard the landing page — all real data, no mockups. This is the
"shell + dreamy-bg + one flagship page" deploy the handoff recommended.

## Part A — Theme visual polish (app-wide, moderate risk)
1. **Dreamy background visible.** The main content panel in
   `apps/frontend/src/components/new-layout/layout.component.tsx` is opaque
   (`bg-newBgLineColor`) and hides the body's dreamy gradient. Switch it to the
   same glass treatment the sidebar + top-bar already use
   (`bg-[var(--glass-surface)] backdrop-blur-xl`) so the gradient shows through
   behind every page. Slightly strengthen the body gradient glows in
   `global.scss` for more depth.
2. **Kill remaining hardcoded purple** `#612bd3` in
   `components/launches/statistics.tsx`, `platform-analytics/render.analytics.tsx`,
   `layout/loading.tsx` → brand blue (`#5c9ad6` / `var(--new-btnPrimary)`).
3. `.glass-surface` is already a real class (translucent + blur), so cards gain
   true depth once the background shows.

**Risk:** the main-panel → glass is the only app-wide change; consistent with the
already-glassy sidebar/top-bar. Verify build; owner reviews live and can ask to
dial opacity. Can't render locally.

## Part B — Dashboard as home (new flagship, real data)
- New `apps/frontend/src/app/(app)/(site)/dashboard/page.tsx` +
  `components/dashboard/dashboard.component.tsx`.
- **First** nav item in `top.menu.tsx` firstMenu; make the app land on
  `/dashboard` (repoint the post-login/root redirect; verify it doesn't break auth).
- Transparent page background so glass cards float over the dreamy bg.
- Widgets — all real, IG-safe (no live-provider/analytics calls):
  - Time-based greeting (no emoji) + today's date.
  - 6 stat cards: Connected accounts (active/total), Scheduled, Published (30d),
    Drafts, Clients, Needs-attention. Sources: `/integrations/list`,
    `/integrations/customers`, `/posts/list?state=…`.
  - "Up next" — upcoming scheduled posts (`/posts/list?state=scheduled`).
  - "Connected accounts + health" — with real Reconnect
    (`/integrations/social/:id?refresh=`), last-publish from
    `/integrations/last-published`.
  - "Recent activity" — recently published (`/posts/list?state=published`).
  - "Needs approval" — posts with pending client approval IF queryable from
    `/posts/list`; else deferred (no fake).
- **Deferred (not faked):** Top-Performing + Audience heatmap (need live
  per-channel analytics), Campaigns widget (Campaigns module not built yet).

## Non-goals (this pass)
- Sidebar shell restructure (floating pieces / collapsible / theme-toggle-to-Settings)
  — owner chose visual polish only.
- Tags, campaigns, analytics-heavy widgets.

## Verification
`prisma`-free (no schema change). `pnpm run build:frontend` clean; deploy via the
proven pipeline; verify `/dashboard` route + theme markers live in the container +
site 200 / API 401. Owner reviews the live look.
