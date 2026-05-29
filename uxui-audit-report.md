# D3 Creator — UX/UI Audit Report

**Date:** 2026-05-29
**Method:** Three parallel surface analysts (Public Site, Admin Panel, Creator Dashboard), each grounded in real source files and using the Magic MCP (`21st_magic_component_inspiration`) for pattern references.
**Scope:** 22 findings across 3 surfaces. Every finding cites an exact file/line and a working inspiration URL.

> **Magic MCP confirmation:** all three agents loaded and called `mcp__magic__21st_magic_component_inspiration`. Public ran `modern landing hero`, `pricing call to action`, `mobile responsive nav`. Admin ran `admin dashboard layout`, `data table`, `filter form panel`. Creator ran `analytics dashboard cards`, `empty state onboarding`, `stat metric card`. Where the MCP returned inline component code rather than a stable public URL, findings cite a canonical design-resource URL instead (tagged `design-resource`); MCP-sourced links are tagged `magic-mcp`.

---

## 1. Executive Summary — Top 3 Cross-Cutting Problems

### 🔴 1. The yellow-mono brand contract is broken by foreign colors on the two logged-in surfaces
Both the Admin panel and the Creator dashboard render `emerald`/`red`/`amber` for deltas, status pills, and destructive buttons. `DESIGN.md` §2 (Semantic — Yellow-mono) and §8 (Anti-Slop, "zero tolerance" for purple/cyan/pink/red/green outside the semantic table) forbid this outright — direction and status must be carried by **icon + label + yellow intensity**, never hue. This is the single most repeated, most spec-breaking issue in the codebase and it lives on users' primary screens.
- Admin: `(admin)/admin/profiles/page.tsx` deltas/status/delete
- Creator: `(creator)/me/creator-stats.tsx` deltas, `(creator)/me/profiles/page.tsx` Remove button

### 🔴 2. No active-route indicator on any of the four layouts — and it's exactly what brand yellow is reserved for
Public, Admin, and Creator nav links all render identically regardless of the current route. `DESIGN.md` §1 (Yellow Ledger) and §4 (Navbar) **explicitly reserve `#F2E600` for the active nav state** ("Active link: color #F2E600", "Active nav — indicator stripe/dot"). So a deliberate, sanctioned, on-brand affordance is being left unused across the entire app while users get zero wayfinding feedback. All three need the same fix: a small client wrapper reading `usePathname()`.
- `(public)/layout.tsx`, `(admin)/layout.tsx`, `(creator)/layout.tsx`

### 🔴 3. First-run, empty, and mutation-feedback moments are unfinished — the highest-intent moments in a login-free funnel
Empty states are bare one-line gray boxes (creator no-profiles, leaderboard, profiles), destructive admin actions fire instantly with no confirm / pending / result feedback, and the creator-owned "add a tracked URL" flow gives no real scrape-status feedback loop. For a product whose pitch is "just live numbers," the moments where a user has *no* numbers yet are precisely where onboarding must do its work — and they're currently the least designed.
- `(creator)/me/page.tsx`, `(creator)/me/profiles/*`, `(admin)/admin/profiles/page.tsx` mutations

---

## 2. Priority Matrix

### 🔴 Critical
| # | Surface | Issue | Location | Effort |
|---|---------|-------|----------|--------|
| C1 | Public | Header has no mobile navigation — links overflow on phones | `(public)/layout.tsx` (nav, L40–85) | half-day |
| C2 | Public | Auth brand/trust panel hidden on mobile — context-free bare form | `components/auth/auth-shell.tsx` (L19) | half-day |
| C3 | Public | Hero CTAs lack hierarchy + signup copy references a removed URL-connect flow | `(public)/page.tsx` (L127–141), `(auth)/signup/page.tsx` (L15) | under-1h |
| C4 | Admin | Foreign emerald/red/amber colors violate yellow-mono palette | `(admin)/admin/profiles/page.tsx` (L46–59, 266, 272) | half-day |
| C5 | Admin | Destructive mutations fire instantly — no confirm, pending, or result feedback | `(admin)/admin/profiles/page.tsx` (L119–138, 268–277), `actions.ts` | half-day |
| C6 | Creator | Foreign red/green delta + button colors violate yellow-mono mandate | `(creator)/me/creator-stats.tsx` (L31–34), `me/profiles/page.tsx` (L151–156) | under-1h |
| C7 | Creator | Primary CTAs use non-existent `text-bg` token → label isn't near-black on yellow | `me/profiles/add-profile-form.tsx` (L157, L216) | under-1h |
| C8 | Creator | Empty/zero-data states are bare gray text — no onboarding, icon, or CTA | `me/page.tsx` (L50–57), `creator-stats.tsx` (L209–215), `me/leaderboard` (L75–78) | half-day |

### 🟡 Medium
| # | Surface | Issue | Location | Effort |
|---|---------|-------|----------|--------|
| M1 | Public | Bottom CTA band duplicates hero + "synthetic data" disclaimer erodes trust at decision point | `(public)/page.tsx` (L446–474) | under-1h |
| M2 | Public | No active-route indicator (violates DESIGN.md navbar spec) | `(public)/layout.tsx` (L41–58) | under-1h |
| M3 | Public | `floating-shapes-hero.tsx` uses radial gradient + infinite loops (Anti-Slop §8) | `components/reactbits/floating-shapes-hero.tsx` (L50–51, 74) | under-1h |
| M4 | Admin | Accounts list has no search/filter/sort despite being the primary data surface | `(admin)/admin/profiles/page.tsx` (L71–83, 147–160) | multi-day |
| M5 | Admin | Topbar nav has no active state; panel would benefit from a left rail | `(admin)/layout.tsx` (L34–39) | half-day |
| M6 | Admin | Pending-claim cards expose raw UUIDs; affirmative action not emphasized | `(admin)/admin/profiles/page.tsx` (L104–141) | half-day |
| M7 | Creator | `/me/profiles` is a raw `<ul>/<li>` debug view with no scrape-status feedback loop | `me/profiles/page.tsx` (L127–164), `add-profile-form.tsx` | half-day |
| M8 | Creator | No active-nav state across 4 dashboard tabs | `(creator)/layout.tsx` (L36–68) | under-1h |
| M9 | Creator | KPI grid is flat; hero metric undersold; "New followers today" duplicated; no sparklines | `me/creator-stats.tsx` (L42–70, 139–156) | half-day |

### 🟢 Low
| # | Surface | Issue | Location | Effort |
|---|---------|-------|----------|--------|
| L1 | Public | Auth testimonial unattributed ("D3 Talent Academy team") — weakens transparency brand | `components/auth/auth-shell.tsx` (L34–45) | half-day |
| L2 | Admin | Uppercase `tracking-wide` labels break Linear-flat sentence-case rule | `(admin)/admin/page.tsx` (L57), `profiles/page.tsx` (L110, 174) | under-1h |
| L3 | Admin | Dashboard stat cards flat/undifferentiated — "dashboard-by-numbers" anti-pattern | `(admin)/admin/page.tsx` (L50–63) | multi-day |
| L4 | Creator | Account page is a thin stub; redundant "Tracked profiles" link; no danger zone | `me/account/page.tsx` (L37–67) | half-day |
| L5 | Creator | `/me/leaderboard` posts lack thumbnails/platform context that `/me` cards already have | `me/leaderboard/page.tsx` (L80–105) | half-day |

---

## 3. Quick Wins (under 1 hour each)

These three are the best effort-to-impact ratio: each is `under-1h`, fixes a 🔴/🟡 issue, and tightens brand compliance.

1. **Fix the creator-dashboard foreign colors (C6).** In `(creator)/me/creator-stats.tsx` replace `deltaClass()`'s `text-emerald-400`/`text-red-400` branches with a non-chromatic glyph treatment: ▲ + `text-fg` for positive, ▼ + `text-fgMuted` for negative, `text-fgSubtle` for zero. Swap the red Remove button for the `--color-danger` token + X icon. Instantly brings the primary creator screen back inside the design system.

2. **Fix the broken CTA text token (C7).** In `me/profiles/add-profile-form.tsx`, `text-bg` is a no-op (no `bg` color key exists in `tailwind.config.cjs`), so the yellow CTA label inherits white. Swap `text-bg → text-canvas` (near-black) on both buttons — a real contrast/brand fix on the most important action of the creator-owned URL flow.

3. **Correct the hero/signup funnel copy (C3).** In `(public)/page.tsx` give the hero one decisive primary CTA and demote the second to ghost; in `(auth)/signup/page.tsx` rewrite the subheading that promises the **removed** "connect your dashboard and leaderboard URLs" step to describe the real `/me` self-provision flow. Stops the funnel from making a false promise.

> Bonus near-quick-win: the **active-nav indicator** (M2/M5/M8) is `under-1h` per surface and can be solved once with a shared `<NavLink>` client component reused across all three layouts — see Roadmap Phase 1.

---

## 4. Roadmap — Suggested Order

### Phase 1 — Brand compliance sweep (≈1 day, mostly quick wins)
Restore the design system before adding anything new. Do these together because they share the same root cause (off-spec color/typography/chrome):
1. C6 + C4 — purge all `emerald`/`red`/`amber` from Creator then Admin; replace with icon + yellow-intensity.
2. C7 — fix `text-bg` → `text-canvas` on CTAs.
3. M2 + M5 + M8 — build **one** shared `'use client'` `<NavLink usePathname>` component with the DESIGN.md active-yellow treatment; wire into all three layouts.
4. L2 — drop `uppercase tracking-wide` from non-table labels.
5. M3 — bring `floating-shapes-hero.tsx` into Anti-Slop spec (or delete if unused — confirm with a repo search first).

### Phase 2 — Mobile & funnel integrity (≈1–1.5 days)
The public site is the acquisition surface; fix what mobile users and new signups actually hit:
1. C1 — mobile nav disclosure/hamburger.
2. C2 — show condensed brand/trust block above the auth form on mobile.
3. C3 + M1 — hero CTA hierarchy, corrected signup copy, single-CTA closing band, gate the "synthetic data" disclaimer on data actually being absent.

### Phase 3 — First-run & feedback loops (≈1.5–2 days)
Make the empty/zero-data and mutation moments feel finished:
1. C8 — build a shared `EmptyState` component (icon tile + title + description + primary CTA + platform-icon row); make the no-profiles state the centerpiece of `/me`.
2. C5 — wrap admin destructive/approve/reject actions in `useActionState`/`useFormStatus`: pending state, toasts, confirm modal for Delete; return result objects instead of throwing.
3. M7 — rebuild `/me/profiles` rows as GlassCards with PlatformPill + scrape-status Badge (Collecting… / Tracking / Couldn't fetch) + a "first stats within ~24h" ETA.

### Phase 4 — Data density & depth (≈3–4 days)
Higher-effort, lower-urgency polish that lifts the product from functional to intentional:
1. M9 — sparklines on creator KPIs, drop the duplicate "New followers today" tile, scale-contrast the hero metric.
2. M4 — admin accounts search/filter/sort with URL-as-state.
3. M6 — resolve claimant identity (email/name, not UUID); emphasize the affirmative action.
4. L3 — bento-ify the admin dashboard with trend deltas.
5. L4 + L5 — flesh out the account page (sectioned cards, danger zone); reuse `TopPostCard` for the leaderboard so "View all" is a richer drill-down, not a downgrade.

---

## 5. Full Findings Detail

### PUBLIC SITE — UX/UI Suggestions

#### Public header has no mobile navigation — links overflow/crowd on phones
- 📍 Location: `apps/frontend/src/app/(public)/layout.tsx` (L40–85, the `<nav>` block)
- 🔍 Problem: The header nav is a single always-on `flex items-center gap-1` row (About, Dashboard, Leaderboard + Sign in/Sign up, or Admin/My data/Sign out). No breakpoint handling, no hamburger. At 375px the logo + brand text + five tap targets cannot fit a 56px bar inside `max-w-[1200px] px-6`; links squeeze below 44px and the yellow Sign up pill collides with the logo. This is the primary entry point for a public, mobile-heavy product.
- ✅ Fix: Split into desktop (`hidden md:flex`) and a mobile disclosure (`md:hidden`) hamburger toggling a full-width sheet. Keep the yellow CTA visible on mobile; move secondary links into the panel; enforce 44px tap targets. Needs a small `'use client'` toggle since the layout is a Server Component.
- 🔗 Inspiration: https://21st.dev `(magic-mcp)` — "Navbar with underline" / "Navbar Login" disclosure patterns
- Severity: 🔴 critical · Effort: half-day

#### Auth brand panel is hidden on mobile — signup/login users see a context-free bare form
- 📍 Location: `apps/frontend/src/components/auth/auth-shell.tsx` (L19: `aside className="... hidden lg:flex ..."`)
- 🔍 Problem: The entire left brand panel (logo, testimonial, "Live analytics · 5 platforms · daily snapshots" trust strip) is `hidden lg:flex`. Below 1024px every phone user lands on `/signup`/`/login` with only an eyebrow pill + heading + form. Removing all brand reassurance and social proof on the device where most signups happen hurts conversion and trust.
- ✅ Fix: Render a condensed brand/trust block above the form on mobile (logo + one-line value prop + "5 platforms · daily snapshots" chip), either by moving those nodes into an `lg:hidden` element atop the right `<main>` or making the aside a slim top banner under `lg`. Keep the full split at `lg+`.
- 🔗 Inspiration: https://mobbin.com `(design-resource)`
- Severity: 🔴 critical · Effort: half-day

#### Hero CTAs and copy don't match a login-free funnel and reference a removed flow
- 📍 Location: `apps/frontend/src/app/(public)/page.tsx` (L127–141 hero CTAs) and `apps/frontend/src/app/(auth)/signup/page.tsx` (L15 subheading)
- 🔍 Problem: The hero offers two equal-weight buttons ("View Dashboard" + "View Leaderboard") with no intent hierarchy — both go to read-only views, with no creator claim/signup path from the hero. Worse, signup's subheading promises "connect your dashboard and leaderboard URLs to see your personal view" — but `onboarding/page.tsx` documents that flow as deprecated (creators self-provision on first profile-add via `/me`). The CTA sets a false expectation.
- ✅ Fix: One decisive primary action in the hero (e.g. "Explore the leaderboard"), demote the second to ghost; add a clearly secondary "Are you a D3 creator? Claim your page" link if signup is a goal. Rewrite the signup subheading to describe the real `/me` self-provision flow.
- 🔗 Inspiration: https://21st.dev `(magic-mcp)` — "MINIMAL" hero (one filled + one outline button)
- Severity: 🔴 critical · Effort: under-1h

#### Bottom CTA band uses two equal buttons and a trust-eroding "synthetic data" disclaimer
- 📍 Location: `apps/frontend/src/app/(public)/page.tsx` (L446–474, BOTTOM CTA BAND)
- 🔍 Problem: The closing band repeats the hero's two equal buttons, so the page ends with no escalation — it loops users back to the same two reads. Directly beneath sits "Showcase preview · synthetic data until the scraper switches on." On the most conversion-critical band of a product pitched as "No fake case studies. Just live numbers," admitting the numbers are synthetic undercuts the brand promise at the decision moment.
- ✅ Fix: Make the closing band a distinct, higher-intent moment with one primary CTA. Gate the "synthetic data" line on `liveSummary`/`liveTopCreators` (already computed) being null, so it only shows when live data is genuinely absent.
- 🔗 Inspiration: https://21st.dev `(magic-mcp)` — "Pricing"/"Pricing Section" single-dominant-CTA emphasis
- Severity: 🟡 medium · Effort: under-1h

#### Navigation has no active-route indicator, violating DESIGN.md navbar spec
- 📍 Location: `apps/frontend/src/app/(public)/layout.tsx` (L41–58)
- 🔍 Problem: Every nav link uses identical `text-fgMuted hover:text-fg hover:bg-white/[0.04]` with no active state. DESIGN.md §4 specifies "Active link: color #F2E600" and §1 Yellow Ledger lists "Active nav — Indicator stripe/dot" as a sanctioned yellow use. Users on `/dashboard` or `/leaderboard` get zero wayfinding and a deliberate on-brand affordance goes unused.
- ✅ Fix: Extract nav links into a `'use client'` component reading `usePathname()`; apply `text-brand` (+ optional 1.5px bottom indicator) to the matching route, `text-fgMuted` otherwise.
- 🔗 Inspiration: https://ui-patterns.com `(design-resource)`
- Severity: 🟡 medium · Effort: under-1h

#### floating-shapes-hero.tsx violates the project's own Anti-Slop rules (radial gradient + infinite loops)
- 📍 Location: `apps/frontend/src/components/reactbits/floating-shapes-hero.tsx` (L74 radial-gradient `after:`, L50–51 `repeat: Infinity`)
- 🔍 Problem: Renders an `after:bg-[radial-gradient(circle_at_50%_50%,rgba(242,230,0,0.12),transparent_70%)]` glow plus framer-motion `repeat: Infinity` float on decorative shapes. DESIGN.md §8 bans radial/mesh gradients, glow halos, and infinite decorative animations (zero tolerance); §7 forbids infinite decorative loops. The public hero deliberately uses DottedSurface instead — this component breaks the brand contract if reused, and is misleading reference code if dead.
- ✅ Fix: Delete if unused (it isn't referenced by `(public)/page.tsx` or `about/page.tsx`), or bring to spec: remove the radial `after` layer, change `repeat: Infinity` to a single-fire reveal, and gate motion behind the already-imported `useReducedMotion`. Confirm usage with a repo search before removing.
- 🔗 Inspiration: https://www.awwwards.com `(design-resource)`
- Severity: 🟡 medium · Effort: under-1h

#### Auth left-panel testimonial has no real attribution — generic quote weakens trust
- 📍 Location: `apps/frontend/src/components/auth/auth-shell.tsx` (L34–45, blockquote + "D3 Talent Academy team")
- 🔍 Problem: The brand-panel quote is attributed to a generic "D3 Talent Academy team" with a placeholder "D" avatar. For a product positioned on radical transparency, an unattributed self-quote with a fake-looking avatar reads as filler and contradicts the anti-vanity stance. It also only appears on `lg+`, so it does nothing for most users.
- ✅ Fix: Replace with a real named person + role (or a genuine tracked creator handle), or swap the quote for concrete live proof matching the brand voice — e.g. the "Tracked creators / Combined followers / 30d net growth" stat trio already computed on the home page.
- 🔗 Inspiration: https://dribbble.com/tags/login-page `(design-resource)`
- Severity: 🟢 low · Effort: half-day

---

### ADMIN PANEL — UX/UI Suggestions

#### Foreign colors (emerald/red/amber) violate the strict yellow-mono palette
- 📍 Location: `apps/frontend/src/app/(admin)/admin/profiles/page.tsx` (`deltaClass` L46–49, `STATUS_STYLE` L51–59, delete button L272, pending count L266)
- 🔍 Problem: Uses `text-emerald-400`/`text-red-400`/`text-amber-400` and `border-emerald-500/30` for deltas, scrape-status pills, the Delete button, and pending counts. DESIGN.md §2 (Yellow-mono) and §8 Anti-Slop ("zero tolerance" for green/red outside the semantic table) forbid any foreign hue. The biggest brand breach on the surface, in three spots.
- ✅ Fix: Remove `deltaClass` color branching and `STATUS_STYLE` hues. Deltas: glyph + yellow tone (positive `text-fg` + up arrow, negative `text-fgSubtle` + down arrow). Status pills from DESIGN tokens (`--warning #FDE047`, `--danger #4D3800` with `--color-danger-fg`, `--success #F2E600`) each paired with a Lucide check/x/clock + label. Make Delete a ghost variant; move destructive emphasis to a confirm step.
- 🔗 Inspiration: https://linear.app `(design-resource)`
- Severity: 🔴 critical · Effort: half-day

#### Destructive mutations fire instantly with no confirm, pending state, or result feedback
- 📍 Location: `apps/frontend/src/app/(admin)/admin/profiles/page.tsx` (delete L268–277, approve/reject L119–138) and `actions.ts` (L57–69)
- 🔍 Problem: Delete/Approve/Reject are bare `<form action={serverAction}>` buttons. One click permanently deletes a profile (cascading to `profile_claim`/`profile_snapshot`/`post_snapshot` per `actions.ts` L62–64) with no confirm, no disabled/pending state, no toast; on error the action throws (L37/53/67) and the user sees nothing. A data-loss hazard that fails the "handle errors explicitly / user-friendly messages" rule.
- ✅ Fix: Wrap each trigger in a client component using React 19 `useActionState` + `useFormStatus`: disable + spinner while pending, surface `{ok,error}` as a toast. Gate Delete behind a confirm modal requiring an explicit second click. Return result objects from the actions instead of throwing.
- 🔗 Inspiration: https://mobbin.com `(design-resource)`
- Severity: 🔴 critical · Effort: half-day

#### Accounts list has no search, filter, or sort despite being the primary admin data surface
- 📍 Location: `apps/frontend/src/app/(admin)/admin/profiles/page.tsx` (header L71–83, accounts section L147–160)
- 🔍 Problem: Every creator group renders as a flat vertical stack of cards with no search by name/handle, filter by platform/scrape-status, or sort by reach/delta. At real agency scale this becomes an unscannable scroll. Magic MCP "filter form panel" (Filters/Filter Badge/Flexi Filter Table) and "data table" (Basic Data Table/Data Grid Table + Column Controls) confirm the expected pattern — a filter toolbar + sortable list — is entirely absent.
- ✅ Fix: Add a sticky filter toolbar: search `Input` (reuse `components/ui/input.tsx`) bound to `?q=`, platform filter chips from `PlatformPill`, scrape-status filter. Persist filter/sort in the URL (web/patterns.md "URL as state"). Add a `?sort=` control (reach/todayΔ/engagement), server-side via `searchParams` to stay force-dynamic with no client data layer.
- 🔗 Inspiration: https://www.refero.design `(design-resource)`
- Severity: 🟡 medium · Effort: multi-day

#### Topbar nav lacks an active-state indicator; panel has no sidebar density
- 📍 Location: `apps/frontend/src/app/(admin)/layout.tsx` (nav L34–39)
- 🔍 Problem: Dashboard/Accounts links render identically whether active or not — no yellow indicator for the current route, which DESIGN.md reserves yellow for (§1, §4 "Active link: color #F2E600"). Static `<Link>`s with no `usePathname` comparison. The panel would also read better with a left rail for nav + density (per the Magic dashboard-layout collapsible-sidebar results).
- ✅ Fix: Convert nav to a client component reading `usePathname`; apply `text-aurora-cta` to the active link, `text-fgMuted`→hover `text-fg` otherwise. Consider promoting to a left sidebar rail (Dashboard, Accounts, Pending claims) so the claims queue becomes a first-class destination with a count badge.
- 🔗 Inspiration: https://dribbble.com/tags/admin-dashboard `(design-resource)`
- Severity: 🟡 medium · Effort: half-day

#### Pending-claim cards expose raw UUIDs and bury the most important action
- 📍 Location: `apps/frontend/src/app/(admin)/admin/profiles/page.tsx` (pending claim item L104–141, esp. L116 `User: {c.userId}`)
- 🔍 Problem: Each pending-claim row shows `User: {c.userId}` — a bare DB UUID — as the only identifier of who is claiming the profile, so an admin can't tell who they're approving. Approve and Reject also get equal visual weight with the metadata, so the decision context (handle didn't auto-match) is easy to miss.
- ✅ Fix: Resolve and display the claimant's email/name (join `auth` user or `user_role`) instead of the UUID; if only an id exists, label + truncate it with a copy affordance. Make the matched-vs-claimed handle comparison the focal point ("claimed @x — profile handle is @y"); keep Approve as the single yellow primary and Reject as a ghost secondary.
- 🔗 Inspiration: https://www.ui-patterns.com/patterns `(design-resource)`
- Severity: 🟡 medium · Effort: half-day

#### Uppercase tracking-wide labels break the Linear-flat sentence-case rule
- 📍 Location: `apps/frontend/src/app/(admin)/admin/page.tsx` (stat label L57) and `profiles/page.tsx` (StatCard L174, pending label L110)
- 🔍 Problem: Stat labels use `uppercase tracking-wide` (CREATORS, PLATFORM PROFILES). DESIGN.md §3 states "No uppercase tracking-wide titles — Linear-flat is sentence-case, tight-tracked"; §4 allows caps ONLY on table header rows. These aren't table headers, so it's off-spec and makes the dashboard read like a generic template.
- ✅ Fix: Drop `uppercase tracking-wide`; use `text-caption`/`text-label` tokens in sentence case ("Creators", "Platform profiles"). For distinction lean on weight/opacity (`text-fgMuted`), not caps. Reserve caps for an actual `<thead>` when a real table is introduced.
- 🔗 Inspiration: https://linear.app `(design-resource)`
- Severity: 🟢 low · Effort: under-1h

#### Dashboard stat cards are flat and undifferentiated — no hierarchy, trend, or point of view
- 📍 Location: `apps/frontend/src/app/(admin)/admin/page.tsx` (stats grid L50–63)
- 🔍 Problem: The `/admin` landing is three identical glass cards (Creators/Platform profiles/Users), each a label + number, all linking to the same `/admin/profiles`. No trend, sparkline, delta, or hierarchy — the "dashboard-by-numbers" / "default card grids with uniform spacing and no hierarchy" pattern banned by web/design-quality.md. Magic "admin dashboard layout" returned a bento composition (hero metric + chart + feature cards) as a more intentional model.
- ✅ Fix: Differentiate the cards: lead metric as a larger bento tile with a today-Δ caption (data exists as `reachDelta` in `admin-creators`) using the yellow-mono delta glyph; give each card a distinct destination/quick-action instead of all → `/admin/profiles`; add a monochrome trend indicator rather than a static number.
- 🔗 Inspiration: https://www.awwwards.com/websites/dashboard/ `(design-resource)`
- Severity: 🟢 low · Effort: multi-day

---

### CREATOR DASHBOARD — UX/UI Suggestions

#### Foreign red/green colors violate the yellow-mono brand mandate
- 📍 Location: `apps/frontend/src/app/(creator)/me/creator-stats.tsx` (`deltaClass` L31–34), `me/profiles/page.tsx` (Remove button L151–156), `add-profile-form.tsx` (error text L166)
- 🔍 Problem: `deltaClass()` returns `text-emerald-400`/`text-red-400` for deltas (followers + per-platform breakdown); the Remove button uses `text-red-400`/`hover:bg-red-500/10`/`border-red-500/30`; the add-form error uses `text-red-400`. DESIGN.md §2 and §8 Anti-Slop forbid red/green/any foreign hue "anywhere" — status must come from icon + label + yellow intensity. The most brand-breaking issue on the surface, on the creator's primary screen.
- ✅ Fix: Remove the emerald/red branch. Encode direction non-chromatically: positive = `text-fg` + up caret/arrow, negative = `text-fgMuted` + down caret, zero = `text-fgSubtle`. For Remove use the `--color-danger` (#4D3800) surface + X icon + "Remove" label per the Badge danger variant. For errors, `text-fg` + caution glyph, not `text-red-400`.
- 🔗 Inspiration: https://21st.dev `(magic-mcp)` — StatisticCard arrow-driven delta pattern (drop its colors)
- Severity: 🔴 critical · Effort: under-1h

#### CTA buttons use a non-existent text token, so primary-action text isn't near-black
- 📍 Location: `apps/frontend/src/app/(creator)/me/profiles/add-profile-form.tsx` (Add button L157; "Add selected" L216)
- 🔍 Problem: Both primary buttons are `bg-aurora-cta text-bg`. There is no `bg` color key in `tailwind.config.cjs` (verified — no `text-bg` utility is generated), so `text-bg` is a no-op and the label inherits white/`fg`. DESIGN.md §1 and §4 require near-black text (#0A0A0D / `--text-on-brand`) on the yellow CTA. White-on-yellow is a real contrast and brand defect on the most important action of the creator-owned URL flow.
- ✅ Fix: Replace `text-bg` with the near-black on-brand color. Cleanest: a reusable Button/CTA component per DESIGN.md §4 (`bg-aurora-cta text-canvas`, `rounded-lg h-10 font-medium`, `hover:bg-brand-300`, active translateY). Minimum: swap `text-bg → text-canvas` in both buttons.
- 🔗 Inspiration: https://21st.dev `(magic-mcp)`
- Severity: 🔴 critical · Effort: under-1h

#### Empty / zero-data states are bare gray text boxes with no onboarding or hierarchy
- 📍 Location: `me/page.tsx` (no-profiles L50–57), `creator-stats.tsx` (`Empty()` L209–215), `me/leaderboard/page.tsx` ("No post snapshots yet." L75–78), `me/profiles/page.tsx` (Section empty L122–124)
- 🔍 Problem: Every empty state is a single rounded box of `fgMuted` text. For a login-free analytics product, the first-run experience of a creator with zero profiles IS the onboarding — yet it's a one-liner with an inline underline link. No icon, headline, focal point, primary CTA, or "what's next." The "dashboard-by-numbers / library defaults" anti-pattern from web/design-quality.md, wasting the highest-intent funnel moment.
- ✅ Fix: Build a shared `EmptyState` component (icon tile in a glass-subtle rounded square + `text-section` title + `text-body fgMuted` description ≤52ch + a real primary CTA button + secondary link), mirroring the Magic `Empty` primitive. For no-profiles make it the centerpiece: "Track your first profile" / "Paste an Instagram, TikTok, Facebook, RedNote or Douyin URL — daily stats appear within 24h" / yellow "Add a profile" CTA → `/me/profiles` + the 5 platform icons. Keep all colors yellow-mono.
- 🔗 Inspiration: https://21st.dev `(magic-mcp)` — `Empty` primitive + `OnboardingCard`
- Severity: 🔴 critical · Effort: half-day

#### /me/profiles uses raw `<ul>/<li>` rows and ad-hoc forms — no scrape-status feedback loop
- 📍 Location: `me/profiles/page.tsx` (Section list L127–164) and `add-profile-form.tsx` (L138–224)
- 🔍 Problem: This is the flow the recent commit made creator-owned, yet it reads like a debug view. `scrape_status` is dumped as raw uppercase text ("PENDING"/"FAILED"/"OK") in `text-fgSubtle` with no badge, icon, or explanation of when stats appear — a creator who pastes a URL gets no real progress feedback. The input/buttons are hand-rolled (`px-4 py-2 rounded-md`), diverging from the DESIGN.md input spec (8px radius, #F2E600 focus border + 3px yellow focus shadow). `PlatformPill` exists and is used on `/me` but not here.
- ✅ Fix: Render each claim as a `GlassCard` row: `PlatformPill`, display name, URL, and a status Badge (pending = default + clock "Collecting…", ok = brand + check "Tracking", failed = danger + X "Couldn't fetch — re-check URL"). Add a "First stats within ~24h" ETA under a freshly-added pending row. Move input/buttons to the shared input + Button components matching the DESIGN.md focus-ring spec.
- 🔗 Inspiration: https://dribbble.com/tags/dashboard `(design-resource)`
- Severity: 🟡 medium · Effort: half-day

#### Active navigation state is missing — creators can't tell which dashboard tab they're on
- 📍 Location: `apps/frontend/src/app/(creator)/layout.tsx` (nav links L36–68)
- 🔍 Problem: All four links (Dashboard/Profiles/Leaderboard/Account) render identically as `text-fgMuted hover:text-fg` with no active styling. DESIGN.md §1 and §4 reserve yellow for the active nav state ("Active link: color #F2E600"; "Active nav — indicator stripe/dot"). The brand's primary orientation affordance is unused, and on a 4-section dashboard the user has no visual anchor.
- ✅ Fix: Make the nav a client component (or pass the segment) and apply `usePathname`-based active state: active → `text-aurora-cta` + 2px yellow underline or leading dot; inactive → `text-fgMuted hover:text-fg`.
- 🔗 Inspiration: https://mobbin.com/explore/web `(design-resource)`
- Severity: 🟡 medium · Effort: under-1h

#### KPI grid is visually flat and undersells the hero metric; deltas read as decorative not directional
- 📍 Location: `apps/frontend/src/app/(creator)/me/creator-stats.tsx` (KPI section L42–70, `Kpi()` L139–156)
- 🔍 Problem: Six KPI tiles are near-uniform (only the followers card spans 2 columns). No sparkline/trend context on any KPI — though the `Sparkline` component is used on the public `DashboardShowcase` hero but NOT on the creator's own `/me`, making the personal dashboard less expressive than the marketing showcase. "New followers today" is duplicated (inside the Total followers card L51–57 and again as its own tile L65–69). Without color, the signed % delta is easy to miss.
- ✅ Fix: Add a 30d follower `Sparkline` to the hero card (reuse `dashboard-showcase/sparkline.tsx`). Drop the duplicate "New followers today" tile; reuse the slot (best-performing platform, or 7d view trend). Render deltas with a ▲/▼ caret + signed value at `text-fg`/`text-fgMuted` intensity (no color). Add scale contrast: hero value at display-1, secondary tiles at section.
- 🔗 Inspiration: https://21st.dev `(magic-mcp)` — StatisticCard arrow pattern
- Severity: 🟡 medium · Effort: half-day

#### Account page is a thin stub with no real settings UX and a dangling secondary link
- 📍 Location: `apps/frontend/src/app/(creator)/me/account/page.tsx` (L37–67)
- 🔍 Problem: The Account surface is just a display-name form plus a "Tracked profiles" card linking to `/me/profiles` — which the global nav already links to, so it's redundant. No avatar control, no identity block beyond inline "Signed in as", no notifications/export, no danger-zone (delete account / stop all tracking). For a login-free product where the creator's only knobs are identity + tracked URLs, the page feels unfinished.
- ✅ Fix: Restructure into sectioned GlassCards: (1) Profile — avatar upload + display name (mirror the Magic `OnboardingCard` upload-row + @-input), (2) Identity — email + sign-out, (3) optional "Stop tracking everything" danger action using the danger token + icon. Remove the redundant "Tracked profiles" card or convert it to a live summary ("3 profiles tracked across 2 platforms").
- 🔗 Inspiration: https://21st.dev `(magic-mcp)` — `OnboardingCard`
- Severity: 🟢 low · Effort: half-day

#### /me/leaderboard top-posts list has no thumbnails or platform context, unlike the /me top-content cards
- 📍 Location: `apps/frontend/src/app/(creator)/me/leaderboard/page.tsx` (post list L80–105)
- 🔍 Problem: The full leaderboard renders posts as a plain text rank list (number, caption, date, views) even though the query selects `media_url`, and `/me`'s `TopPostCard` (`creator-stats.tsx` L158–198) already renders thumbnails via `/api/proxy-image` + platform pill + 2x2 stat grid. The "View all →" link on `/me` promises depth but the destination is sparser — an inverted hierarchy. It also only surfaces "views", hiding likes/comments/engagement.
- ✅ Fix: Reuse the `TopPostCard` pattern (extract to a shared component) for the leaderboard, or render a denser table with thumbnail + `PlatformPill` + caption + views/likes/comments/engagement columns (`tabular-nums`) matching DESIGN.md §4 Tables (48px rows). Keep the rank but anchor #1 to the brand active-data treatment so "View all" is a richer drill-down.
- 🔗 Inspiration: https://mobbin.com/explore/web `(design-resource)`
- Severity: 🟢 low · Effort: half-day

---

## Appendix — Method & Caveats

- **Files analyzed (not generic advice):** all `(public)`, `(auth)`, `(admin)`, `(creator)` route pages + layouts, plus `auth/`, `about/`, `creator-showcase/`, `dashboard-showcase/`, `leaderboard-showcase/`, `reactbits/`, and `ui/` components, cross-referenced against `DESIGN.md`, `colors.scss`, `global.scss`, and `tailwind.config.cjs`.
- **Magic MCP:** used by all three agents (9 inspiration searches total). Some MCP responses returned inline component code rather than a stable public URL; in those cases findings cite a canonical design-resource homepage/collection (`design-resource`) rather than a fabricated deep link. MCP-derived references are tagged `magic-mcp` and point to 21st.dev.
- **Recurring root cause:** ~40% of findings trace to drift from `DESIGN.md` (yellow-mono palette, sentence-case typography, active-nav yellow, Anti-Slop §8). A single brand-compliance pass (Roadmap Phase 1) clears most of them cheaply.
