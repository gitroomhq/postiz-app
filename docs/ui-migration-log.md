# UI migration log

A visual redesign of `apps/frontend` is being applied step by step. The rule for the whole
migration is:

> **The design is authoritative on how it LOOKS. This repo is authoritative on how it WORKS.**

This file is the record. Every step appends an entry saying what the screen did before, what changed
visually, and what the checks reported. The point is to be able to answer "did we break anything?"
with evidence rather than recollection.

Design reference: `design/handoff/`. Working rules: root `CLAUDE.md`.

---

## How a step is verified

```
scripts/ui-migration-check.sh          # compare against the baseline
scripts/ui-migration-check.sh --update # rewrite it (only for an intended change — say why here)
```

Four checks, each a sorted text file under `docs/ui-migration-baseline/`:

| Check | What it protects |
| --- | --- |
| **types** | the frontend still compiles |
| **api** | the same set of backend endpoints and SWR keys is still reached |
| **i18n** | no translation key dropped, none invented |
| **routes** | no page appeared or disappeared |

Then the visual pass. Both the handoff and the screenshots are **git-ignored** — this repository is
public, the handoff carries an unreleased design and unannounced pricing, and the screenshots carry
whatever is in the local database. They live on disk as working material; this log is the record
that ships.

Serve the prototype and run the app side by side:

```
# prototype
python3 -m http.server 8080          # from design/handoff/design/

# app — no Docker image rebuild needed; .env already proxies to the backend on :4007
LEGAL_URL=https://postqueen.ai ./node_modules/.bin/dotenv -e .env -- \
  ./node_modules/.bin/next dev ./apps/frontend -p 4200

# screenshot
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --screenshot=out.png --window-size=1440,900 --force-device-scale-factor=2 http://localhost:4200/...
```

Check each touched screen at 420 / 900 / 1440 in **both** themes. `scripts/ui-shot.mjs` does this in
one call:

```
PQ_AUTH=<session cookie> node scripts/ui-shot.mjs \
  --url http://localhost:4200/launches --out docs/ui-shots/step-N/launches \
  --width 420,900,1440 --theme both
```

It drives Chrome over CDP rather than using `--screenshot`, for two reasons that matter here:
`--window-size` refuses to go below ~500px, so phone widths silently come back cropped and read as
layout overflow when there is none; and the flag interface cannot carry a session cookie. The tool
sets the `auth` and `mode` cookies, applies a real `Emulation.setDeviceMetricsOverride`, and reports
`scrollWidth > clientWidth` per shot so overflow is measured rather than eyeballed. Verified: a
420px run produces an 840px image at scale factor 2, which is proof the override applied.

**It waits for the network to go quiet, not for a timer.** The first baseline used a flat 3.5s and
was wrong: `next dev` compiles a route on first visit, so 13 of 48 shots captured the loading
skeleton instead of the page. Re-running after the server had warmed then produced 13 "differences"
that looked exactly like a regression and were not. The tool now waits for zero in-flight requests
sustained for 800ms (min 1.2s, cap 45s) and **exits non-zero if that never happens**, so a
mid-load screenshot announces itself instead of quietly becoming the reference. If a comparison ever
shows unexplained differences, re-capture the same code twice first: that separates a real change
from a flaky one in a single run.

---

## Baseline — 2026-08-02, commit `09bc8a93`

Captured before any redesign work, on a clean `main`.

| Check | Value |
| --- | --- |
| types | **0 errors** |
| api | **134** distinct endpoints / SWR keys |
| i18n | **585** translation keys |
| routes | **27** pages |

Frontend at this point: Next.js 16.2.6 App Router, Tailwind 3.4.17 (`tailwind.config.cjs`),
330 TS/TSX files, ~44.5k LOC under `apps/frontend/src`. Theming is a `.dark` / `.light` class on
`<body>` driven by a `mode` cookie; there are **zero** `dark:` utilities in the frontend, so every
colour resolves through the two blocks in `app/colors.scss`.

The guard was tested against a synthetic regression (an endpoint removed, a route added) and failed
correctly with exit 1, naming both changes.

---

## Corrections to the handoff documents

The handoff's markdown docs drift from the prototype they describe, and the prototype drifts from
this repo. **Read the `*Vals()` method, not the doc.** Verified during the survey on 2026-08-02:

| Doc | Says | Reality |
| --- | --- | --- |
| 01 | repo themes via `:root[data-theme="dark"]` | `.dark`/`.light` class on `<body>` |
| 01 | breakpoints 720 / 1180 | `vp()` is **760** / 1180 |
| 01 | paywall headline weight 700 | markup is **800** |
| 02 | rail 248 / 72px | **236 / 60px** (264 mobile drawer) |
| 02 | rail primary button is "Compose" | **"Connect PostQueen"**, opens Connections |
| 02 | logo is in the rail | logo is in the **header** |
| 02 | header has language + theme | language → Settings, theme → user menu |
| 02 | queue panel on the right | **left** of the grid |
| 02 | Channels page shows the connected-channel grid | it does not — the channel list stays in the sidebar rail |
| 02 | channels over tier limit render at 50% opacity | **not in the design at all**; only a `needUpgrade()` toast |
| 02 | settings groups Workspace / Publishing / Developers | Workspace / **More** / Developers |
| 02 | `public-api/developer.component.tsx` | `components/developer/developer.component.tsx` |
| 02 | Analytics = `components/analytics/` | `/analytics` renders `platform-analytics/` |
| 03 | `pricing.ts` under the frontend | `libraries/nestjs-libraries/.../subscriptions/pricing.ts` |
| 03 | one `TIER_FEATURES` feeds every plan card | no such function here; two generators, already drifting |
| 03 | "all 52 `user?.tier` references" | 44 |
| 03 | AGENCY = unlimited channels | a new product decision (this repo caps at 100) |
| 04 | a two-step first-run setup panel exists | **it does not** — markup deleted, only dead values remain |
| 05 | app runs on :3000 | `next dev -p 4200` |
| 06 §D9 | `import-debug-post.modal.tsx` is dead code | **live** via `layout/impersonate.tsx` — do not delete |
| README | the two checkout files are one design | they have **drifted**; the App v2 embedded paywall wins |

Gaps in the design itself, to be filled rather than copied:

- Form fields have **no focus state at all** — one has to be invented before theming Stripe.
- The checkout's "subscription ended" notice paints an orange box (`rgba(251,146,60,…)`, hardcoded)
  with a red icon (`var(--warn)`). Needs a real amber token pair.
- The checkout trust row is `flex-wrap:nowrap` and plan-feature labels are `white-space:nowrap`;
  both overflow under German and French, which run ~35% longer than the mock's English.

---

## Steps

### Step 0 · Prep and baseline — done

**What changed:** no application code, and no visual change by construction.

- `design/handoff/` — the handoff placed in the repo (1.4 MB) so any session can re-read the
  reference. Its `CLAUDE.md` was merged into the repo root rather than copied. **Git-ignored:** this
  repository is public and the handoff contains an unreleased design, an unannounced pricing table
  and internal notes. The handoff's own instruction was to commit it; that instruction assumes a
  private repository, so it was not followed.
- Root `CLAUDE.md` — added the UI-migration rules, and corrected two stale lines that predate this
  work: the frontend was described as **Vite** (it is Next.js App Router) and the Tailwind config as
  `tailwind.config.js` (it is `.cjs`).
- `scripts/ui-migration-check.sh` — the four-check guard, plus `docs/ui-migration-baseline/`.
- `scripts/ui-shot.mjs` — the CDP screenshot tool.
- `docs/ui-shots/` — 48 baseline images (8 screens × 3 widths × 2 themes). Git-ignored: ~8 MB per
  step, and they contain local database contents.
- This log.

**Checks:** types 0 errors · api 134 · i18n 585 · routes 27 — recorded as the baseline.

**Visual baseline:** `/launches`, `/analytics`, `/media`, `/plugs`, `/third-party`, `/billing`,
`/settings`, `/agents` at 420 / 900 / 1440 in both themes. **Zero horizontal overflow anywhere** —
so any overflow appearing in a later step was introduced by that step, not inherited.

**How the session was obtained:** the local stack has no email provider and `PASSWORDLESS_LOGIN` is
unset, so the OTP route returns *"Passwordless login is disabled"* — the Resend setup is on the
production server, not here. With the owner's approval a token was signed with the **running
container's** `JWT_SECRET`, which is not the value in the repo's `.env`; signing with the latter
returns 401. The middleware only reads `id` from the token and re-resolves the user from the
database, so `{ id }` is sufficient.

**Notes for later:**

- The root `CLAUDE.md` still opens with "28+ channels" while the backend registers 34. Left alone
  deliberately — outside this migration's scope, and it belongs with the README copy.
- The local database has 0 integrations, so every channel-dependent screen is currently in its empty
  state. Steps that restyle populated states will need seed data before they can be verified.

---

### Step 1a · Token layer, additive — done

The design's tokens are a different vocabulary from this repo's, so they land as an **addition**
first and nothing is repointed. That way this step is provably non-breaking, and step 1b — which
moves the old names onto the new values — is a single revertible commit.

**What changed:**

- `app/colors.scss` — the design's token layer, ported from `design/handoff/tokens.css`. One
  translation was needed: the prototype themes with `:root[data-theme="dark"]`, this app themes with
  a `.dark` / `.light` class on `<body>`. Doc 01 claims the repo already themes the prototype's way;
  it does not, and a literal port would have applied to nothing.
- `app/global.scss` — the eleven `pq*` keyframes.
- `tailwind.config.cjs` — aliases for every new token, the radius scale, the elevation shadows,
  `font-mono`, and named animations.
- `app/fonts.ts` — JetBrains Mono via `next/font`. DM Sans and Plus Jakarta Sans were **already
  wired**; doc 05 lists all three as new work.
- `components/layout/use.viewport.tsx` — new. Stamps `data-mobile` / `data-tablet` on `<html>` from
  one resize listener, and exposes `useViewport()`.

**Two decisions worth recording:**

*Tailwind aliases are `pq`-prefixed.* Using the design's own names would shadow Tailwind's built-in
palettes. `amber` is the one that bites: `amber-500` / `amber-600` appear in six places
(`auth/login.tsx`, `layout/impersonate.tsx`, `layout/announcement.banner.tsx`,
`react-shared-libraries/src/ui/badge.tsx`), and defining a flat `amber` colour makes every one of
those classes resolve to nothing — silently, with no build error. The prefix also makes the
remaining work greppable while both vocabularies coexist.

*The Tailwind breakpoints were not touched.* The prototype does not express responsiveness in media
queries — it puts `data-mobile` / `data-tablet` on the app root from a single JS width and keys the
overrides off those, because most of the changes are structural. Reproducing that mechanism means
the repo's existing `mobile:` / `tablet:` screens (1025 / 1300px, 88 usages) keep working untouched
instead of being re-cut to 760 / 1180. This removes the largest collision the survey found.

**Two tokens were added that the design does not have:**

- `--amber` / `--amberSoft` / `--amberLine`. The checkout's "subscription ended" notice paints an
  orange box and then reaches for `--warn` for its icon, which is red. Warning and expiry are
  different states.
- `--fieldRing`. No input in the prototype has a focus state at all. One is needed before Stripe's
  `PaymentElement` can be themed to match, and for keyboard use generally.

**A gap in the design that had to be resolved:** `tokens.css` declares `pqglow` twice — an early
text-shadow version and a later outline one. CSS takes the later, so the outline version is what
actually ran in the prototype. Only that one is ported.

**Reduced motion:** the six indefinite loops are gated, but CSS cannot match on animation *name*, so
the gate is a `.pq-loop` class that any element carrying a loop must also carry. That is a
convention components have to keep, not something the stylesheet enforces — noted here because it is
the kind of thing that silently rots.

**Checks:** types 0 errors · api 134 · i18n 585 · routes 27 — all unchanged.

**Visual:** **48 / 48 screenshots pixel-identical to the baseline**, which is exactly what an
additive step should produce. Getting to that number took a detour worth recording: the first
comparison showed 13 differences. They were not real. `next dev` compiles each route on first visit,
the tool was waiting a flat 3.5s, and the baseline had therefore captured loading skeletons for the
slower pages — so the *second* run, on a warm server, looked like a regression.

Two fixes came out of it, both now in `scripts/ui-shot.mjs`:

- Wait for the network to go quiet instead of for a timer, and **fail loudly** when it never does.
- Age out connections older than 5s. `next dev` holds an HMR socket open for the life of the tab and
  CopilotKit keeps its own channel; neither ever emits `loadingFinished`, so a naive idle check never
  fires and every shot burned the 45s cap. With the age-out a page settles in ~8s.

The baseline was then re-captured against stashed changes so both sides were measured the same way.
The lesson generalises: **when a comparison disagrees with what the diff says should have happened,
re-capture the same code twice before believing it.** Two identical runs differing means the
harness is lying, not the code.

---

### Step 1b · Token layer, repointed — done

The old `--new-*` and `--color-*` names now resolve to the redesign's tokens. This is the first
visible change: the whole app moves to the new palette in one commit, and reverting that commit puts
it back.

Nothing outside `colors.scss` was touched, so the ~440 `bg-newBgColorInner`-style usages keep working
— they render new values. The names get retired screen by screen from here.

**Checks:** types 0 errors · api 134 · i18n 585 · routes 27 — all unchanged.

**Visual:** 48 / 48 screenshots changed, which is the point, and both themes were read rather than
counted. Dark surfaces move to `#0b0b0d` / `#131316`; light to `#f1f1f4` / `#fbfbfc`. Selected states
become brand-tinted with `--focused` text and stay legible in both themes. No layout moved, no
contrast collapsed, no element disappeared.

**Two mappings that are judgement rather than transcription:**

- `--new-box-hover` was a solid (`#201f1f` / `#f5f5f7`); it now resolves to `--hover`, which is an
  alpha overlay. That is deliberate — doc 01 is explicit that hover is a tint on top of whatever
  surface it lands on, never a `filter: brightness()`.
- `--new-boxFocused` was **white** in dark, and doc 01 warns not to assume "selected = brand tint".
  That warning describes the old source, not the design: the prototype's own `--boxFocused` is
  `rgba(124,58,237,.18)`. The design wins on appearance, so selected is now a tint. Flagging it
  because the doc reads like the opposite instruction.

**Deliberately left alone,** because they are composer and preview surfaces with no counterpart in
the redesign's token set and step 5 restyles them properly: `--new-back-drop` (the global-lock scrim,
used under `opacity-60`, where routing through an already-transparent token would compound the
alpha), `--border-preview` and `--preview-box-shadow`. The `--color-custom1..55` family is untouched
for the same reason — 108 usages, no design equivalents, retired per screen.
