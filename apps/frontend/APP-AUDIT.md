# SocialStream App Surface — Cadence Retrofit Audit

**Date:** 2026-05-14
**Scope:** `apps/frontend/` — the Next.js App Router fork of Postiz that serves `app.socialstream.be`.
**Goal:** Inventory every route, every Cadence violation, and every missing surface so Wave 2.0 (token foundation) can start clean.
**Method:** Hybrid — static code pass over 25 page.tsx files + ~1000 TSX files in `apps/frontend/src/components/`, plus live walkthrough of the four unauthenticated surfaces against production (`https://app.socialstream.be`). The remaining 21 surfaces sit behind authentication and could not be captured in this session — flagged for a follow-up walkthrough once a test account is wired up or the dev stack is bootable locally.
**Briefing:** `/Users/storex/.claude/plans/i-want-you-to-fizzy-wind.md`
**Cadence rules:** `design-system/cadence/HANDOFF.md` + `colors_and_type.css` (in the marketing repo).

---

## TL;DR

The app is on **legacy SocialStream blue** (`#1a6fe8`) — a v1 rebrand of the underlying Postiz purple (`#612bd3`) that completed in PRs #4–9 of this fork. That swap was tactical: it broke the most jarring "Postiz purple/pink" stuff but never reached the design system. **Cadence retrofit is greenfield work, not patch work.** The token architecture, the font, the dark default, the hardcoded purples in OAuth/onboarding, the Title Case copy — all of it needs Wave 2.0 to land before screen-level work is safe.

**Three load-bearing facts:**

1. **The app defaults to dark mode and is dark-only in practice.** Cadence ships light mode first; dark tokens exist but are out of scope for this phase. **Wave 2.0 must force light mode (Mist canvas) on every authenticated surface** and ship dark separately.
2. **There is no design system right now — there is a 99-color Tailwind soup.** `tailwind.config.cjs` exposes 99 color tokens (`primary`, `forth`, `seventh`, `customColor1..55`, `new*` family, per-platform brand bg colors). 95% of these will collapse to ~12 Cadence semantic tokens (`--fg`, `--bg`, `--border`, `--accent`, etc.). The `customColor*` tokens are likely dead; sweep before Wave 2.0.
3. **Two production-bug-class issues surfaced during the live walkthrough that should land before any retrofit:**
   - **Register page links Terms of Service and Privacy Policy to `https://postiz.com/terms` and `https://postiz.com/privacy`** ([apps/frontend/src/components/auth/register.tsx?](apps/frontend/src/components/auth/register.tsx) — verify; rendered on `/auth`). SocialStream is operated by Fordax BV under its own DPA/ToS/Privacy. Linking to Postiz's legal pages on a registration form is a real legal/compliance gap, not a brand quibble.
   - **`Wallet` (crypto wallet) login provider is enabled.** Off-positioning for B2B EU SME audience. Either kill it or move it behind an env flag before any pilot sees the page.

The license footer + `/source` route are correctly wired (verified live: `/source` 307s to a GitHub release tag pinned to the current commit SHA `63818dba`). **Don't touch the AGPL plumbing.**

---

## Route table — all 25 surfaces

URLs reflect Next.js App Router conventions: `(app)`, `(site)`, `(provider)`, `(extension)` are route GROUPS (parens) and don't appear in URLs.

| # | Route URL | File | Renders | Title / H1 (current) | Notes |
|---|-----------|------|---------|----------------------|-------|
| **Public preview** | | | | | |
| 1 | `/p/[id]` | [(preview)/p/[id]/page.tsx](apps/frontend/src/app/(app)/(preview)/p/[id]/page.tsx) | `Auth` (SSR post preview wrapper) | (no top-level heading) | Public read-only post preview. Renders `/postiz.svg` brand asset — broken Cadence visual. |
| **Auth flows (unauth, captured live today)** | | | | | |
| 2 | `/auth` (Register) | [auth/page.tsx](apps/frontend/src/app/(app)/auth/page.tsx) | `Register` / `LoginWithOidc` | "Sign Up" | **Title Case H1.** Continue With → Google + Wallet. **Legal links go to postiz.com/terms + postiz.com/privacy — production bug.** Email/Password/Company fields. |
| 3 | `/auth/login` | [auth/login/page.tsx](apps/frontend/src/app/(app)/auth/login/page.tsx) | `Login` | "Sign In" | **Title Case H1.** "Continue With", "Don't Have An Account?", "Forgot password" (lowercase, OK). Wallet provider. |
| 4 | `/auth/forgot` | [auth/forgot/page.tsx](apps/frontend/src/app/(app)/auth/forgot/page.tsx) | `Forgot` | "Forgot Password" | **Title Case H1**, button **"Send Password Reset Email"** (Title Case). |
| 5 | `/auth/forgot/[token]` | [auth/forgot/[token]/page.tsx](apps/frontend/src/app/(app)/auth/forgot/[token]/page.tsx) | `ForgotReturn` | (not captured — needs valid token) | Reset-password form. |
| 6 | `/auth/activate` | [auth/activate/page.tsx](apps/frontend/src/app/(app)/auth/activate/page.tsx) | `Activate` | "Activate your account" | **Sentence case — already correct.** Sub-heading "Didn't receive the email?" OK. Button "Resend Activation Email" (Title Case). |
| 7 | `/auth/activate/[code]` | [auth/activate/[code]/page.tsx](apps/frontend/src/app/(app)/auth/activate/[code]/page.tsx) | `AfterActivate` | (not captured — needs valid code) | Activation success/failure screen. |
| 8 | `/auth/login-required` | [auth/login-required/page.tsx](apps/frontend/src/app/(app)/auth/login-required/page.tsx) | inline | "Login to use the wizard to generate API code" | Hardcoded `bg-[#121212]` — legacy dark. |
| **Authenticated app** | | | | | |
| 9 | `/launches` | [(site)/launches/page.tsx](apps/frontend/src/app/(app)/(site)/launches/page.tsx) | `LaunchesComponent` | (no top-level H1) | Calendar + composer entry point. CTAs: `Add provider`, `New Post`, `Filters`. **The single highest-traffic surface in the product.** |
| 10 | `/billing` | [(site)/billing/page.tsx](apps/frontend/src/app/(app)/(site)/billing/page.tsx) | `BillingComponent` | (no top-level H1) | Tier comparison + invoice history. Wave 2.6. |
| 11 | `/billing/lifetime` | [(site)/billing/lifetime/page.tsx](apps/frontend/src/app/(app)/(site)/billing/lifetime/page.tsx) | `LifetimeDeal` | (no top-level H1) | Postiz lifetime-deal upsell. **Probably kill — SocialStream is a managed-subscription service, no lifetime tier.** Confirm with Mark. |
| 12 | `/analytics` | [(site)/analytics/page.tsx](apps/frontend/src/app/(app)/(site)/analytics/page.tsx) | `PlatformAnalytics` | (no top-level H1) | Wave 2.5. Chart components use canvas gradients (chart.tsx, chart-social.tsx). |
| 13 | `/settings` | [(site)/settings/page.tsx](apps/frontend/src/app/(app)/(site)/settings/page.tsx) | `SettingsPopup` | (no top-level H1) | Renders as a popup, not a full page surface. Wave 2.6 needs to restructure into editorial sectioned settings shell per briefing. |
| 14 | `/agents` → `/agents/new` | [(site)/agents/page.tsx](apps/frontend/src/app/(app)/(site)/agents/page.tsx) | `redirect('/agents/new')` | (redirect) | AI-agent feature. **Confirm with Mark whether this stays in Phase A or gets gated.** Postiz upstream feature. |
| 15 | `/agents/[id]` | [(site)/agents/[id]/page.tsx](apps/frontend/src/app/(app)/(site)/agents/[id]/page.tsx) | `AgentChat` | (dynamic) | AI agent chat UI. |
| 16 | `/media` | [(site)/media/page.tsx](apps/frontend/src/app/(app)/(site)/media/page.tsx) | `MediaLayoutComponent` | (no top-level H1) | Media library. |
| 17 | `/plugs` | [(site)/plugs/page.tsx](apps/frontend/src/app/(app)/(site)/plugs/page.tsx) | `Plugs` | (no top-level H1) | Postiz "plugs" automation/integrations. Confirm with Mark whether this is in scope. |
| 18 | `/third-party` | [(site)/third-party/page.tsx](apps/frontend/src/app/(app)/(site)/third-party/page.tsx) | `ThirdPartyComponent` | (no top-level H1) | Third-party integrations. |
| 19 | `/admin/errors` | [(site)/admin/errors/page.tsx](apps/frontend/src/app/(app)/(site)/admin/errors/page.tsx) | `AdminErrorsComponent` | (no top-level H1) | Admin error log viewer. |
| 20 | `/err` | [(site)/err/page.tsx](apps/frontend/src/app/(app)/(site)/err/page.tsx) | inline | (no top-level H1) | Generic app-level error fallback. **Cadence "calm error copy" target — Wave 2.1.** |
| **Integrations / OAuth** | | | | | |
| 21 | `/integrations/social/[provider]` | [integrations/social/[provider]/page.tsx](apps/frontend/src/app/(app)/integrations/social/[provider]/page.tsx) | `ContinueIntegration` | (no top-level H1) | Per-channel connect flow. Wave 2.2 channel-connect wizard. |
| 22 | `/oauth/authorize` | [oauth/authorize/page.tsx](apps/frontend/src/app/(app)/oauth/authorize/page.tsx) | client-side OAuth flow | "Authorization Error" or app name | **Heavy hardcoded `#612BD3` Postiz purple + `rounded-full blur-[120px]` orbs (6×).** Worst single file in the codebase. |
| **Provider WebView (mobile/desktop bridges)** | | | | | |
| 23 | `/provider/add` | [provider/add/page.tsx](apps/frontend/src/app/(provider)/provider/add/page.tsx) | `MobileIntegration` | (no top-level H1) | Mobile-app provider-add bridge. |
| 24 | `/provider/[p]` | [provider/[p]/page.tsx](apps/frontend/src/app/(provider)/provider/[p]/page.tsx) | `InBridge` | (no top-level H1) | Provider settings WebView bridge. |
| **Browser extension** | | | | | |
| 25 | `/modal/[style]/[platform]` | [modal/[style]/[platform]/page.tsx](apps/frontend/src/app/(extension)/modal/[style]/[platform]/page.tsx) | `StandaloneModal` | (no top-level H1) | Browser-extension popup. Out of band — runs inside the extension, not in the main app shell. |

### Layout chrome ownership

| Layout file | Owns |
|-------------|------|
| [(app)/layout.tsx](apps/frontend/src/app/(app)/layout.tsx) | Root HTML, fonts, i18n, analytics (Plausible + PostHog), Sentry, license footer. **Wave 2.0 token import + font swap lands here.** |
| [(app)/(site)/layout.tsx](apps/frontend/src/app/(app)/(site)/layout.tsx) | Authenticated app chrome — `LayoutComponent` wraps top bar + left sidebar around all `(site)` routes. **Wave 2.1 global chrome rebuild lands here.** |
| [(app)/auth/layout.tsx](apps/frontend/src/app/(app)/auth/layout.tsx) | Auth-flow wrapper — currently `bg-[#0E0E0E] / bg-[#1A1919]` legacy dark split. **Wave 2.2 lands here.** |
| [(app)/integrations/social/layout.tsx](apps/frontend/src/app/(app)/integrations/social/layout.tsx) | Integration flow wrapper. |
| [(app)/oauth/authorize/layout.tsx](apps/frontend/src/app/(app)/oauth/authorize/layout.tsx) | OAuth screen wrapper. |
| [(app)/(preview)/p/[id]/layout.tsx](apps/frontend/src/app/(app)/(preview)/p/[id]/layout.tsx) | Public post-preview wrapper (share-friendly, minimal chrome). |
| [(app)/(site)/agents/layout.tsx](apps/frontend/src/app/(app)/(site)/agents/layout.tsx) | Agent chat wrapper. |
| [(provider)/layout.tsx](apps/frontend/src/app/(provider)/layout.tsx) | WebView bridge wrapper (no Plausible). License footer kept. |
| [(extension)/layout.tsx](apps/frontend/src/app/(extension)/layout.tsx) | Browser-extension wrapper. License footer kept. |

---

## Live walkthrough — the four reachable unauth surfaces (2026-05-14)

Captured against production `https://app.socialstream.be`. Screenshots live alongside this audit:

- `app-auth-login-2026-05-14.png` — `/auth/login`
- `app-auth-register-2026-05-14.png` — `/auth`
- `app-auth-forgot-2026-05-14.png` — `/auth/forgot`
- `app-auth-activate-2026-05-14.png` — `/auth/activate`

### What I saw

- **Layout pattern is split-screen:** form on the left half, big sentence "Schedule social media posts across multiple channels" floating on the right — same on every auth surface. There is no editorial Midnight aside (Cadence's reference login pattern from `ui_kits/app/login.html`). The right-hand sentence is the only attempt at hero copy and it has zero Fraunces italic cut-in, zero brand voice. **Wave 2.2 will replace this entirely.**
- **The whole surface is dark.** Pure `#000` page background, `#0E0E0E`/`#1A1919` cards, `#FFFFFF` text. Not Cadence Mist. Not Cadence Midnight either — it's a darker, neutral graphite, closer to GitHub dark than to Cadence dark.
- **Logo lockup is SocialStream v1 (blue waves + blue "Stream" wordmark).** Marketing site already moved to v2 (Coral waves + Coral "Stream"). **App logo needs to be swapped to match.** Lockup files live at `site/public/lockup-horizontal-{light,dark}.svg` in the marketing repo — copy across.
- **Primary "Sign in" button is bright SocialStream blue (`#1a6fe8`).** Cadence primary buttons are Midnight-on-Mist (or Coral-on-Mist for accent), never blue. Token swap in Wave 2.0 fixes this universally.
- **Casing is Title Case throughout** — see violations table below.
- **Footer is correct.** "This service is built on Postiz (AGPL-3.0). Source code: github.com/SocialStream-SaaS/socialstream-app." Both links work; `/source` 307s to a GitHub release tag pinned to commit SHA `63818dba`. **Do not touch.**
- **`Wallet` provider button** appears on Sign In + Sign Up. Crypto wallet login. Wrong audience. **Action item separate from the retrofit: gate behind env flag or remove.**
- **`/auth` Terms of Service + Privacy Policy links go to postiz.com.** Production legal bug — see TL;DR.

### What I could not capture this session

The 21 authenticated surfaces (everything in `(site)`, `(provider)`, `(extension)`, and `/oauth/authorize` in its post-grant state). Two paths to close that gap before Wave 2.4 (Calendar) lands:

1. **Spin up a real test account on production.** Cheapest. Use a throwaway email through `/auth` → activate → connect a single dev OAuth app for one channel → walk through Launches/Calendar/Analytics/Billing/Settings. Capture per-surface screenshots into `apps/frontend/screenshots/`.
2. **Boot the dev stack locally.** Postiz needs Postgres + Redis + Temporal + the backend container. Heavier lift; warranted only if the test account doesn't surface enough variety (e.g., admin, multi-workspace, agency multi-brand views).

I recommend option 1 between Phase 1 sign-off and Wave 2.0 kickoff. The static-code pass below is enough to plan Wave 2.0 — but the live captures will be needed before Wave 2.4 (Calendar) starts, because that surface is the most layout-heavy and screenshot-dependent.

---

## Cadence violations — consolidated by category

Numbered to match the audit categories in the briefing's Phase 1 spec.

### 1. Forbidden hype copy

**Status: clean.** No `supercharge`, `AI-powered`, `revolutionize`, `delight`, `magical`, `10x`, `synergy`, `leverage` (verb), `unlock`, `effortless`, `seamless`, `game-changer`, `turbo`, `boost`. The Postiz codebase is naturally restrained on the marketing-y vocabulary.

One non-violation: [`apps/frontend/src/components/ui/icons/index.tsx:120`](apps/frontend/src/components/ui/icons/index.tsx:120) — comment `// Small Close Icon (10x11 variant)` is a dimension reference, not hype.

### 2. Emoji in user-visible system strings

**Status: appears clean.** Spot-checked `license-footer.tsx`, `signature.tsx`, and the auth screens — no emoji in system chrome. Any emoji that grep surfaced was inside SVG asset metadata, user-content placeholders, or AGPL attribution text. **A second pass during Wave 2.1 (when copy moves to `content/en.ts`) will be the real check** — anything that smells like emoji should not survive the centralization step.

### 3. Gradients

Eight live offenders, broken into three buckets:

**Bucket A — kill outright (legacy "AI app" decoration):**
- [apps/frontend/src/components/onboarding/onboarding.modal.tsx:217](apps/frontend/src/components/onboarding/onboarding.modal.tsx:217) — `bg-gradient-to-r from-[#622aff] to-[#8b5cf6]` purple gradient button
- [apps/frontend/src/components/onboarding/onboarding.modal.tsx:301](apps/frontend/src/components/onboarding/onboarding.modal.tsx:301) — `bg-gradient-to-r from-[#10b981] to-[#059669]` green gradient button
- [apps/frontend/src/app/global.scss:735, 740](apps/frontend/src/app/global.scss:735) — `linear-gradient(180deg, #0e0e0e 0%, rgba(14,14,14,0) 100%)` fade overlays

**Bucket B — replace with Cadence equivalent:**
- [apps/frontend/src/components/launches/helpers/media.settings.component.tsx:241](apps/frontend/src/components/launches/helpers/media.settings.component.tsx:241) — progress-bar gradient `linear-gradient(to right, #4f46e5 0%, ...)`. Solid Coral fill works here.

**Bucket C — keep (data viz / SVG / pattern):**
- `chart.tsx`, `chart-social.tsx` canvas gradients in analytics — Cadence allows muted gradient fills inside chart areas (single Coral focal series, no rainbow). Re-skin colors during Wave 2.5, don't kill the technique.
- `launches.component.tsx`, `facebook.preview.tsx` SVG `gradientUnits` declarations — these are SVG plumbing, not visual gradients. Leave alone.
- `polonto.css` — third-party Blueprint UI library; out of audit scope.
- `global.scss:616` — `repeating-linear-gradient` pattern fill for some kind of striped placeholder. Cadence actively endorses striped placeholders. Verify usage; likely keep.

### 4. "AI-app" rounded corners (≥16px)

**18 file:line offenders.** All listed in the violations agent output (see `phases/01-audit/violations-raw.md` if you want the full dump). Worst offenders for Phase 2 priority:

- [`oauth/authorize/page.tsx:153`](apps/frontend/src/app/(app)/oauth/authorize/page.tsx:153) — `rounded-[16px] p-[32px]` modal
- [`new-launch/modal.wrapper.component.tsx:49`](apps/frontend/src/components/new-launch/modal.wrapper.component.tsx:49) — `rounded-[24px]` (every launch modal inherits this)
- [`new-launch/manage.modal.tsx:447`](apps/frontend/src/components/new-launch/manage.modal.tsx:447) — `rounded-[20px]`
- [`layout/new-modal.tsx:199`](apps/frontend/src/components/layout/new-modal.tsx:199) — `rounded-[24px]` (global modal wrapper — single-point-of-fix)
- [`new-layout/billing.after.tsx:15`](apps/frontend/src/components/new-layout/billing.after.tsx:15) — `rounded-3xl`
- [`onboarding/onboarding.modal.tsx:27`](apps/frontend/src/components/onboarding/onboarding.modal.tsx:27) — `rounded-[20px]`
- [`billing/first.billing.component.tsx:258`](apps/frontend/src/components/billing/first.billing.component.tsx:258) — `rounded-[20px]`

**Strategy:** Wave 2.0 should NOT chase these individually. Instead, change the global modal wrappers (`layout/new-modal.tsx`, `new-launch/modal.wrapper.component.tsx`) to `--radius-md` (8px) — that single edit kills most of the surface-area damage. Then sweep stragglers in the per-feature waves.

**`rounded-full` mis-uses:**
- [`oauth/authorize/page.tsx:84,85,106,107,144,145`](apps/frontend/src/app/(app)/oauth/authorize/page.tsx:84) — `rounded-full blur-[120px]` blurred gradient orbs (6× in one file). Pure "AI app" decoration. **Delete the whole gradient-orb backdrop in Wave 2.2.**
- [`continue.integration.tsx:272,273`](apps/frontend/src/components/launches/continue.integration.tsx:272) — same orb pattern (2×). Delete.

### 5. Glassy / frosted panels

- [`launches.component.tsx:170`](apps/frontend/src/components/launches/launches.component.tsx:170) — `bg-white/30` frosted card
- [`media.settings.component.tsx:256, 403, 416, 479, 485`](apps/frontend/src/components/launches/helpers/media.settings.component.tsx:256) — `hover:bg-opacity-80` (5×)
- [`third-parties/slider.component.tsx:33,44`](apps/frontend/src/components/third-parties/slider.component.tsx:33) — `bg-black/60 hover:bg-black/80 backdrop-blur-sm` slider controls (2×)

All replaceable with solid Cadence tokens in the relevant per-feature wave. None are in chrome that's hot for Wave 2.0/2.1.

### 6. Mixed font families

- [`apps/frontend/tailwind.config.cjs:125`](apps/frontend/tailwind.config.cjs:125) — `fontFamily: { sans: ['Helvetica Neue'] }`. **Single point of fix for Wave 2.0** — replace with the Cadence font stack.
- [`apps/frontend/src/app/global.scss:405-406`](apps/frontend/src/app/global.scss:405) — `.set-font-family { font-family: 'Helvetica Neue', Helvetica !important; }`. Hardcoded with `!important`. Kill in Wave 2.0.
- [`apps/frontend/src/app/global.scss:566`](apps/frontend/src/app/global.scss:566) — `font-family: Arial;`. Kill.
- `apps/frontend/src/components/new-launch/providers/medium/fonts/stylesheet.css` — Medium "charter" font for the Medium provider preview only. **Keep** — this is intentional fidelity to Medium's typography in the preview pane. Not chrome.

### 7. Title Case / ALL CAPS button labels

The agent found this category mostly clean in component code (most strings flow through `t('key', 'Default')` i18n keys), but the **rendered output** I captured live tells a different story:

| Surface | Current | Cadence target |
|---------|---------|----------------|
| `/auth/login` | `Sign In` (H1) | `Sign in` |
| `/auth/login` | `Continue With` | `Continue with` |
| `/auth/login` | `Don't Have An Account?` | `Don't have an account?` |
| `/auth/login` | `Sign Up` (link) | `Sign up` |
| `/auth/login` + `/auth` | `Email Address` (placeholder) | `Email address` (or just `Email`) |
| `/auth` | `Sign Up` (H1) | `Sign up` |
| `/auth` | `Create Account` (button) | `Create account` |
| `/auth` | `Already Have An Account?` | `Already have an account?` |
| `/auth/forgot` | `Forgot Password` (H1) | `Forgot password` |
| `/auth/forgot` | `Send Password Reset Email` (button) | `Send password reset email` |
| `/auth/activate` | `Resend Activation Email` (button) | `Resend activation email` |
| `/auth/activate` | `Already activated?` (paragraph) | OK as-is |
| `/auth/activate` | `Sign In` (link) | `Sign in` |

The pattern: i18n source strings are Title Case at the source. Once Wave 2.0 lands `content/en.ts`, every string moves to that module in **sentence case**, and the i18n defaults stop mattering.

The one hardcoded button I found: [`third-parties/third-party.list.component.tsx:145`](apps/frontend/src/components/third-parties/third-party.list.component.tsx:145) — `<Button className="w-full">Add</Button>`. Title Case at source.

### 8. Inline color hexes

**OAuth authorize is the worst single file** ([apps/frontend/src/app/(app)/oauth/authorize/page.tsx](apps/frontend/src/app/(app)/oauth/authorize/page.tsx) lines 84, 85, 95, 106, 107, 113, 144, 145, 162, 176, 192, 199):
- `bg-[#612BD3]` × 8 (Postiz purple — the rebrand never reached here)
- `bg-[#FC69FF]` × 2 (Postiz hot pink)
- `border-[#612BD3]` × 1
- `bg-[#1A1919]`, `bg-[#2A2929]`, `bg-[#0E0E0E]`, `bg-[#0B0A0A]` (legacy SocialStream dark palette)

Rest:
- [`auth/layout.tsx:16,19`](apps/frontend/src/app/(app)/auth/layout.tsx:16) — `bg-[#0E0E0E]`, `bg-[#1A1919]`
- [`auth/login-required/page.tsx:3`](apps/frontend/src/app/(app)/auth/login-required/page.tsx:3) — `bg-[#121212]`
- `global.scss` — assorted hardcoded `#fd5956`, `#ffdd00`, `#ae8afc`, `#adb5bd`, `#fff !important`
- `polonto.css` — Blueprint third-party (out of scope)

**Strategy:** Wave 2.0 token foundation makes most of these moot (the legacy CSS vars they should be using will start mapping to Cadence tokens). The OAuth authorize page is the exception — it bypasses the variable system entirely with hardcoded hexes. **Schedule a single dedicated PR for `oauth/authorize/page.tsx` rewrite during Wave 2.2 (auth & onboarding).**

### 9. Postiz brand leaks

**Legitimate (keep):**
- `apps/frontend/src/components/license-footer.tsx` — AGPL attribution (mandated)
- Footer link to `https://github.com/gitroomhq/postiz-app` — AGPL § 7(b) author attribution

**Genuine production bugs (legal/brand):**
- [`(app)/layout.tsx:49, 71-73, 103`](apps/frontend/src/app/(app)/layout.tsx:49) — Plausible analytics domain conditionally `postiz.com` or `gitroom.com`. Should be `app.socialstream.be` (or whatever Mark wants tracked). Env vars `POSTIZ_GENERIC_OAUTH`, `NEXT_PUBLIC_POSTIZ_OAUTH_LOGO_URL`, `NEXT_PUBLIC_POSTIZ_OAUTH_DISPLAY_NAME` — function-named OK; consider rename for consistency but low-priority.
- [`(preview)/p/[id]/page.tsx:60`](apps/frontend/src/app/(app)/(preview)/p/[id]/page.tsx:60) — `src={'/postiz.svg'}`. Rename asset to a SocialStream lockup.
- **`/auth` Register page Terms + Privacy** — links to `https://postiz.com/terms` and `https://postiz.com/privacy`. Captured live today. Fix before any pilot signup. Likely lives in `apps/frontend/src/components/auth/register.tsx` or the i18n strings file — track down in Wave 2.2.
- [`launches/add.provider.component.tsx:271`](apps/frontend/src/components/launches/add.provider.component.tsx:271) — Chrome Web Store link to Postiz extension. **Decide whether SocialStream is shipping its own extension or whether this is killed.**
- [`launches/add.provider.component.tsx:446, 453, 491`](apps/frontend/src/components/launches/add.provider.component.tsx:446) — `postiz://` deep-link protocol references (3×). Mobile-app integration. Decide: kill, or rebrand to `socialstream://` (mobile is deferred per briefing).
- [`auth/providers/wallet.provider.tsx:35`](apps/frontend/src/components/auth/providers/wallet.provider.tsx:35) — `import from '@postiz/wallets'` — npm scope, code-only. Leave; not user-visible.
- [`developer/developer.component.tsx:247, 410`](apps/frontend/src/components/developer/developer.component.tsx:247) — `https://docs.postiz.com/public-api/oauth` — docs links exposed to developer-tier users. Either replace with SocialStream docs domain or scrub.
- [`public-api/public.component.tsx`](apps/frontend/src/components/public-api/public.component.tsx) — **17+ hardcoded `postiz` references** in MCP server config docs. This whole component is a Postiz-branded onboarding doc. Wave 2.6 (settings → API) needs to rewrite it for SocialStream.

### 10. Tailwind color-token inventory (99 tokens)

`tailwind.config.cjs` exposes:

- **Semantic legacy:** `primary`, `secondary`, `third`, `forth` (primary action button), `fifth`, `sixth`, `seventh`, `gray`, `input`, `inputText`, `tableBorder`, `textColor` — 12 tokens
- **Custom palette slots:** `customColor1` … `customColor55` — 55 tokens
- **`new*` family** (newer Postiz design):  `newBgColor`, `newBackdrop`, `newSep`, `newBorder`, `newBgColorInner`, `newBgLineColor`, `textItemFocused`, `textItemBlur`, `boxFocused`, `newTextColor`, `blockSeparator`, `btnSimple`, `btnText`, `btnPrimary`, `ai`, `boxHover`, `newTableBorder`, `newTableHeader`, `newTableText`, `newTableTextFocused`, `newColColor`, `newSettings`, `menuDots`, `menuDotsHover`, `bigStrip`, `popup`, `modalCustom` — 27 tokens
- **Per-platform brand colors:** `bgLinkedin`, `textLinkedin`, `borderLinkedin`, `bgFacebook`, `bgCommentFacebook`, `bgInstagram`, `bgTiktokItem`, `bgTiktokItemIcon`, `bgYoutube`, `bgCommentFacebook`, `youtubeButton`, `youtubeBgAction`, `youtubeSvg`, `borderPreview` — ~14 tokens

**Wave 2.0 strategy (per briefing):**

1. Map every legacy token name to a Cadence semantic token via `tailwind.config.cjs` so untouched components don't visually break.
2. Track the mapping in the PR description (the briefing explicitly asks for this).
3. The `customColor*` set is almost certainly dead in this fork — sweep usage with `grep -r 'customColor' apps/frontend/src/`. Anything zero-referenced gets deleted from `tailwind.config.cjs` and `colors.scss`.
4. The per-platform brand colors **stay as-is** — they're used for accurate channel-preview rendering (LinkedIn-blue inside a LinkedIn post preview). Do not "Cadence-ify" these.

### 11. CSS variable definitions (legacy palette source)

[`apps/frontend/src/app/colors.scss`](apps/frontend/src/app/colors.scss) is the live definition file. Both `.dark` and `.light` blocks define the v1 SocialStream blue rebrand:

- `--new-btn-primary: #1a6fe8;` (was `#612bd3` Postiz purple — comment preserved in source)
- `--new-table-text-focused: #0ea5e9;` (was `#fc69ff`)
- `--color-forth: #1a6fe8;` (was `#612ad5`)
- `--color-seventh: #0ea5e9;` (was `#7236f1`)

Plus 55 `customColor*` entries (lines 113–167) still pointing to original Postiz palette values.

**Wave 2.0 entry point:** create `apps/frontend/src/styles/cadence.css` that imports the marketing repo's `design-system/cadence/colors_and_type.css` + `responsive.css` verbatim, then override `--color-forth`, `--color-seventh`, `--new-btn-primary`, etc. to point at Cadence semantic tokens (`--accent`, `--fg`, `--bg`, etc.). Don't edit `colors.scss` in place — leave the v1 rebrand vars as fallback during the wave-by-wave cutover, then remove `colors.scss` entirely once the last wave is green.

---

## Copy violations — priority list

Sentence case across all chrome and buttons. Wave 2.0 lands `content/en.ts` and every visible string moves to that module in sentence case. Then waves 2.1+ swap component imports. Specific high-frequency offenders to catch first:

1. **All auth screens** — see live walkthrough table above. ~13 strings to fix in one batch.
2. **OAuth authorize page** — likely Title Case throughout; not captured live, but [oauth/authorize/page.tsx](apps/frontend/src/app/(app)/oauth/authorize/page.tsx) is full of hardcoded strings. Inspect during Wave 2.2.
3. **Plus button labels surfaced by the agent:** `Add` ([third-party.list.component.tsx:145](apps/frontend/src/components/third-parties/third-party.list.component.tsx:145)).
4. **i18n source strings** — most labels enter the app via `t('key', 'Default')`. The defaults are Title Case. Convert to sentence case at the source as part of Wave 2.0's `content/en.ts` migration.
5. **Postiz attribution copy** — all developer-tier and public-API surfaces (`developer.component.tsx`, `public.component.tsx`) need full English rewrite for SocialStream voice. Wave 2.6.

---

## Missing surfaces — what Postiz doesn't ship that SocialStream needs

Per Phase 3 of the briefing (Professional polish). Each of these has zero coverage in the codebase today; spot-checked with grep against likely component names and route paths:

| Missing surface | Why SocialStream needs it | First wave it lands in |
|-----------------|---------------------------|------------------------|
| Command palette (`⌘K`) | Power-user shortcut; matches editorial restraint | Wave 2.1 |
| Keyboard shortcuts overlay (`?`) | Free professional polish | Wave 2.1 |
| Toast / notification system | Cadence-styled, mono timestamps, auto-dismiss 4s | Wave 2.1 (replace existing if present, audit first) |
| Workspace switcher | Agency owners need it (multi-brand at €199 tier) | Wave 2.1 |
| Trial countdown banner | Editorial, never-modal, Coral CTA | Wave 2.1 |
| Empty states (striped placeholders) | Cadence anti-pattern says no hand-drawn illustrations | Every list/grid surface across waves 2.3–2.7 |
| Skeleton loaders (hairline only) | No shimmer; 1px borders matching final geometry | Every async surface |
| Audit log / activity trail | Agency / compliance signal | Wave 2.6 (Settings) |
| In-app changelog (`/changelog`) | Public release notes; trust signal | Wave 2.6 (Settings → "What's new") |
| Calm error states | "Something didn't go through" not "Error: 500"; retry + help | Every form across waves; pattern lands Wave 2.1 |
| Help drawer with EN/NL/FR labels | Tiny EU/multilingual signal in EN-only Phase A | Wave 2.1 (`?` menu) |
| 3-step onboarding wizard | Account → Workspace → Connect first channel | Wave 2.2 (probably replaces `onboarding/onboarding.modal.tsx`) |
| Brand-guard E2E across authenticated app | Marketing site has one; app needs parity | Wave 4 (rollout) |
| Editorial settings shell | Current `/settings` renders as a popup. Cadence wants left-rail sectioned settings page. | Wave 2.6 (full rebuild) |
| Approval queue + roles + comments | Postiz has primitives; SocialStream needs the polished editorial surface | Wave 2.7 |
| Public read-only board view | Agency → client review surface | Wave 2.8 |

### Surfaces to confirm in/out of scope with Mark

- **`/billing/lifetime`** — Postiz lifetime-deal surface. SocialStream is monthly subscription. **Probably delete.**
- **`/agents` (AI agents)** — Postiz upstream feature. Stay or hide?
- **`/plugs`** — Postiz automation. Stay or hide?
- **`Wallet` login provider** — crypto wallet auth on the login screen. **Action: env-flag off or remove before pilot.**
- **`postiz://` deep-link protocol + Chrome Web Store extension link** — mobile/extension are explicitly deferred. Hide the entry points or rebrand to `socialstream://`.

---

## Cadence pain index — ordered worst-first

Rank by user-visible damage × surface-area exposure. Wave 2.0/2.1 should attack from the top.

| # | Pain | Where | Estimated fix scope |
|---|------|-------|---------------------|
| 1 | **Default-dark surface, Cadence is light-first** | All routes | Wave 2.0 — force light mode, swap CSS variables |
| 2 | **99-color Tailwind soup with no design-system semantic** | `tailwind.config.cjs` + `colors.scss` | Wave 2.0 — tokens cascade |
| 3 | **Helvetica Neue everywhere, no Inter Tight, no Fraunces, no JetBrains Mono** | `tailwind.config.cjs:125`, `global.scss:405` | Wave 2.0 — single edit |
| 4 | **OAuth Authorize page — hardcoded Postiz purple `#612BD3` + blurred orb decorations** | `oauth/authorize/page.tsx` | Wave 2.2 — dedicated rewrite |
| 5 | **Auth screens: Title Case copy, no editorial hero, generic right-pane sentence** | `/auth`, `/auth/login`, `/auth/forgot`, `/auth/activate` | Wave 2.2 |
| 6 | **Register page Terms + Privacy link to postiz.com** *(production legal bug)* | `/auth` (register component) | Pre-Wave-2.0 hotfix recommended |
| 7 | **Wallet (crypto) login provider** *(audience misfit)* | `/auth`, `/auth/login` | Pre-Wave-2.0 env-flag |
| 8 | **`rounded-[16-24px]` everywhere — modal wrappers, cards, billing tier cards** | 18 file:line offenders, modal wrappers are central | Wave 2.0/2.1 — fix wrappers, then sweep |
| 9 | **Purple/green gradient buttons in onboarding** | `onboarding.modal.tsx:217, 301` | Wave 2.2 — full onboarding rebuild |
| 10 | **Settings renders as a popup, not a page** | `/settings` → `SettingsPopup` | Wave 2.6 — restructure to editorial settings shell |
| 11 | **Postiz brand leaks in developer-tier + API docs** | `developer.component.tsx`, `public.component.tsx` (17+ refs) | Wave 2.6 |
| 12 | **No empty states / skeletons / toasts in Cadence style** | All surfaces | Pattern lands Wave 2.1, sweep through 2.3–2.7 |
| 13 | **Glassy slider controls, frosted launches card** | `slider.component.tsx`, `launches.component.tsx:170` | Wave 2.3 / 2.4 |
| 14 | **`postiz.svg` brand asset on public preview page** | `(preview)/p/[id]/page.tsx:60` | Wave 2.0 (when logo lockup swaps) |

---

## What's already correct — don't touch

- **License footer** ([`apps/frontend/src/components/license-footer.tsx`](apps/frontend/src/components/license-footer.tsx)) — copy + AGPL link wording correct, rendered on every layout.
- **`/source` route** — 307s to a GitHub release tag pinned to current commit SHA. AGPL § 13 compliance verified live.
- **The `gitroomhq/postiz-app` link in the footer** — AGPL § 7(b) author attribution. Required.
- **Per-platform brand colors in Tailwind** (`bgLinkedin`, `bgFacebook`, etc.) — these are intentional fidelity to channel-preview rendering. Leave alone.
- **Medium provider's Charter font CSS** — intentional Medium-preview fidelity. Leave alone.
- **`/auth/activate` H1 "Activate your account"** — already sentence case.
- **Internal layout structure** (route groups, nested layouts, the `(app)/(site)/(provider)/(extension)` split) — Postiz's architecture is sound; the retrofit is a re-skin, not a re-org.

---

## Recommended Wave 2.0 entry-point checklist

When Mark green-lights Phase 2, the first wave should land these in this order in a single PR:

1. Create `apps/frontend/src/styles/cadence.css` that imports (or inlines) the marketing repo's `design-system/cadence/colors_and_type.css` and `responsive.css`.
2. Wire `cadence.css` into `apps/frontend/src/app/(app)/layout.tsx` ahead of `global.scss` so Cadence tokens win cascade order.
3. Override `tailwind.config.cjs` token mappings: every legacy color now resolves to a Cadence semantic token. Track the mapping table in the PR body.
4. Swap font in `tailwind.config.cjs:125` from `Helvetica Neue` to the Cadence font stack. Kill `global.scss:405` `set-font-family` rule.
5. Force light mode on the `(app)/layout.tsx` root — remove the `dark` class application, drop `data-theme="dark"`, ship the app as Mist-canvas-only for this phase.
6. Create `apps/frontend/src/content/en.ts` exporting the typed copy module skeleton (one section per route group). Don't migrate strings yet — that happens in waves 2.1+.
7. Create `apps/frontend/src/components/Icon.tsx` that maps a name string → Lucide outline icon at Cadence sizes (16/20/24/32). Don't migrate call sites yet.
8. Replace `/postiz.svg` with the SocialStream lockup at `apps/frontend/public/lockup-horizontal-light.svg` (copy from marketing repo `site/public/`).
9. (Optional) Wire `apps/frontend/src/app/(app)/__preview/page.tsx` (gated behind `NEXT_PUBLIC_PREVIEW=1`) rendering one Cadence component per route — useful for icon/copy spot-checks.
10. **Verify with the four unauth surfaces:** the screen should look "off" but render. Capture new screenshots into `apps/frontend/screenshots/wave-2.0/` and diff against today's baselines.

Out of scope for Wave 2.0:
- Component-level rewrites (those are waves 2.1+)
- Copy migration (that's wave-by-wave as components move to `content/en.ts`)
- Dark mode (separate phase)
- The two production hotfixes (Terms/Privacy links, Wallet provider) — recommend landing those as their own small PRs *before* Wave 2.0 so they're in production immediately, not gated on the retrofit timeline.

---

## Pre-retrofit hotfixes (recommend landing before Wave 2.0)

These are user-visible bugs that don't need the design system to fix:

1. **Fix Terms + Privacy links on `/auth`** — point to SocialStream's own legal pages (Fordax BV ToS + Privacy). Marketing site already serves `/legal/terms` and `/legal/privacy` equivalents — link to those.
2. **Disable `Wallet` login provider** — env-flag or remove. Crypto wallet auth on a B2B SME publishing tool is dissonant.
3. **Fix Plausible analytics domain** — currently conditionally `postiz.com` or `gitroom.com` ([`(app)/layout.tsx:103`](apps/frontend/src/app/(app)/layout.tsx:103)). Should be `app.socialstream.be`.

Each is < 10 lines, < 30 minutes, under `/gsd:fast`.

---

## Decisions locked with Mark (2026-05-14)

The 5 open questions are answered. These supersede earlier "Recommended" hints anywhere in this doc — when in doubt, this table wins.

| # | Decision | Locked answer |
|---|----------|---------------|
| 1 | `/auth` Terms + Privacy fix | **In-app `/legal/*` routes**, full set of 5 pages mirrored from marketing site (Terms, Privacy, DPA, Subprocessors, SLA, Guarantee terms) |
| 2 | Wallet (crypto) login provider | **Remove entirely** — strip `@postiz/wallets` dependency, drop the button on `/auth` + `/auth/login` |
| 3 | Plausible analytics domain | Fix to `app.socialstream.be` (drop the conditional `postiz.com`/`gitroom.com` ladder) |
| 4 | Hotfix bundling | **One bundled hotfix PR before Wave 2.0**, ran via `/gsd:fast`. Bundle scope expanded — see "Hotfix PR — locked scope" below. |
| 5 | `/billing/lifetime` | **Kill the route** — delete page + component, return 404 |
| 6 | `/agents` (AI) | **Hide for Phase A** — route-guard so nav link + page are unreachable; code stays for future re-enable |
| 7 | `/plugs` | **Hide for Phase A** — same pattern as `/agents` |
| 8 | Mobile + extension hooks | **Kill entirely** — remove `postiz://` deep-link references in `add.provider.component.tsx` (lines 446, 453, 491), remove the Chrome Web Store extension button (line 271), and **delete the entire `(extension)` route group** including `(extension)/layout.tsx` + `(extension)/modal/*` |
| 9 | Light vs dark | **Light only this phase**, defer dark; strip the `.dark` class application + `data-theme="dark"` on `(app)/layout.tsx` |
| 10 | Token migration | **Alias legacy names via `tailwind.config.cjs`** — map `forth`→`var(--accent)` etc.; **sweep dead `customColor*` set in the same Wave 2.0 PR** |
| 11 | i18n / EN-only Phase A | **Keep i18next wired but dormant**, centralize all EN copy in `apps/frontend/src/content/en.ts` (sentence case throughout). When NL/FR ships later, `content/en.ts` becomes the i18next namespace shape — zero structural rework. |
| 12 | Phase 3 polish | **All 12 surfaces in scope**, distributed across natural waves (most in Wave 2.1 chrome) |
| 13 | Phase 1 commit | **Commit + open PR now**, branch `claude/youthful-visvesvaraya-ee1441` |
| 14 | Wave cadence | **One wave at a time** — merge to `main` → VPS rebuild + redeploy → smoke-test at `app.socialstream.be` → next wave |
| 15 | Test account | **Mark creates one on production before Wave 2.0** so live walkthrough of 21 authenticated surfaces can inform Wave 2.0 + 2.1 plans before code work starts |

## Hotfix PR — locked scope

Single PR before Wave 2.0, target file-list (will refine before writing code):

**Legal pages (in-app, EN only for Phase A):**
- `apps/frontend/src/app/(app)/(site)/legal/terms/page.tsx`
- `apps/frontend/src/app/(app)/(site)/legal/privacy/page.tsx`
- `apps/frontend/src/app/(app)/(site)/legal/dpa/page.tsx`
- `apps/frontend/src/app/(app)/(site)/legal/subprocessors/page.tsx`
- `apps/frontend/src/app/(app)/(site)/legal/sla/page.tsx`
- `apps/frontend/src/app/(app)/(site)/legal/guarantee-terms/page.tsx`
  - Each renders the EN content from the marketing site's equivalent component (port to TSX, no Cadence styling yet — that's Wave 2.1+; for the hotfix they just need to render readable HTML).
- `apps/frontend/src/app/(app)/(site)/legal/layout.tsx` — minimal wrapper (no nav/sidebar; standalone for unauth read access).
  - **Decision needed during scoping:** should `/legal/*` be reachable while logged out? Probably yes — Terms link is on Register form which is unauth. So routes need to live outside `(site)` group OR `(site)` layout needs to allow unauth access for `/legal/*`. I'll recommend a sibling `(legal)` route group instead — see scoping back-and-forth.

**Update Register form** (`apps/frontend/src/components/auth/register.tsx` or wherever the consent paragraph lives — to be confirmed during scoping):
- Terms of Service `https://postiz.com/terms` → `/legal/terms`
- Privacy Policy `https://postiz.com/privacy` → `/legal/privacy`

**Wallet provider removal:**
- Remove `Wallet` button rendering on `/auth` + `/auth/login`
- Remove `apps/frontend/src/components/auth/providers/wallet.provider.tsx`
- Remove `@postiz/wallets` from `apps/frontend/package.json`
- Drop any wallet-related env vars + scripts

**Plausible analytics domain:**
- `apps/frontend/src/app/(app)/layout.tsx:103` — replace conditional `postiz.com`/`gitroom.com` with `app.socialstream.be`
- Spot-check `data-domain="postiz.com"` (line 49) — same fix

**Kill `/billing/lifetime`:**
- Delete `apps/frontend/src/app/(app)/(site)/billing/lifetime/page.tsx`
- Delete `apps/frontend/src/components/billing/lifetime-deal.tsx` (or whatever the component is named)
- Sweep for orphan imports

**Hide `/agents` + `/plugs`:**
- Add a small `route-guard.tsx` server component that returns `notFound()` when `process.env.NEXT_PUBLIC_FEATURE_AGENTS !== '1'` (and similarly for plugs)
- Wrap the `/agents` and `/plugs` page.tsx files
- Hide the corresponding nav-link entries in the sidebar component

**Kill mobile/extension entirely:**
- Delete `apps/frontend/src/app/(extension)/` directory in full (layout + `modal/[style]/[platform]/`)
- Strip `postiz://` references in `apps/frontend/src/components/launches/add.provider.component.tsx` (lines 446, 453, 491)
- Strip the Chrome Web Store extension link in `apps/frontend/src/components/launches/add.provider.component.tsx:271`
- Sweep for any other surfaces that link into the deleted extension routes

**Misc Postiz brand leaks (if cheap):**
- Rename `apps/frontend/public/postiz.svg` → `apps/frontend/public/socialstream.svg` and update the one reference in `(preview)/p/[id]/page.tsx:60`. (Logo lockup swap proper happens Wave 2.0; this is just the asset rename.)

The hotfix PR is **not the place** to: change tokens, change fonts, fix copy casing, replace gradient buttons, remove rounded-24 corners. All that waits for Wave 2.0+.

---

*End of audit. Phase 1 complete. Decisions locked. Next: Phase 1 commit + PR, then hotfix PR scoping.*
