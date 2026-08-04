# UI migration log

A visual redesign of `apps/frontend` is being applied step by step. The rule for the whole
migration is:

> **The design is authoritative on how it LOOKS. This repo is authoritative on how it WORKS.**

This file is the record. Every step appends an entry saying what the screen did before, what changed
visually, and what the checks reported. The point is to be able to answer "did we break anything?"
with evidence rather than recollection.

Design reference: `design/handoff/`. Working rules: root `CLAUDE.md`.

---

## Where this stands

| Milestone | State |
| --- | --- |
| 0 · Prep and baseline | done |
| 1 · Token layer | done (1a additive, 1b repointed) |
| 2 · Shell | done — rail, header, drawer, user menu, org switcher, modal shell, toaster |
| 3 · Calendar | done — grid, cells, post card, toolbar, month view |
| 4 · Composer | restyled; **not screenshot-verified** (needs a connected channel) |
| 5 · Channels + inline connect | Add Channel restyled, photographed and **grouped** (34 tiles, counted). The modal→inline-pane conversion is **declined** — it needs a channels page this repo does not have; see below |
| 6 · Settings, Analytics, Media, Plugs, Integrations | done for everything this install renders |
| 7 · Billing, paywall, checkout | **not done.** `/billing` does not render here at all — see below |
| 8 · Feature-gating audit | done — no gate has drifted |
| 9 · Onboarding + tour | tour built and photographed; the existing onboarding modal is unchanged apart from Get Started now starting the tour |
| E · Lifetime redemption | route added — it was missing entirely, see the finding below. Purchase flow still open |
| D · Prices and tier rename | done in code and schema. Live rows move with `scripts/migrate-tiers.mjs`, **run by the owner after a deploy has pushed the schema** |
| 10 · Leftovers (auth, admin, errors) | auth screens checked and already consistent; admin and error pages untouched |

Five checks are green after every step: **types (frontend) 0 · types (backend) 0 · api 134 ·
routes 27 · i18n 629**.

`api` and `routes` have not moved once. `i18n` has moved four times, each in a step that was meant to
add strings and each recorded where it happened: **585 → 607** (step 2, the shell), **607 → 613**
(step 7a, tier labels), **613 → 628** (step 9, the tour), **628 → 629** (the agent drawers). Nothing
was ever removed.

The backend type check was added late, when the migration stopped being frontend-only — the tier
rename, the lifetime route and the provider categories all live in `libraries/` and `apps/backend`,
and a guard that only compiled the frontend waved every one of them through.

**Two surfaces cannot be verified on this install and were not marked verified:** the composer needs
a connected channel — precisely, `launches.component.tsx:522` renders `<NewPost />` only behind
`sortedIntegrations?.length > 0`, so with no channel there is no button to click and the modal has no
entry point at all — and every billing screen needs `billingEnabled`. `/billing` redirects to the
login screen here — and has since before the migration, which is why three baselines filed the
signup page under `billing-*.png` without anyone noticing.

**Two decisions are waiting** in *Open questions* below, plus three things raised since. Nothing is
blocked on any of them: each has a position taken in the meantime, and the two originals are about
wording and a price, not code.

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
| 02 | rail order is logo · org switcher · search · Compose · nav · usage meter · plan chip · user menu | pin/collapse row · hairline · primary button · nav groups · [org switcher · Settings · Upgrade]. Logo and user menu are in the **header** |
| 02 | nav groups are Publish / Grow / More | **two** groups — one unlabelled, one "More" (`chromeVals():5611`) |
| 02 | header is title · streak · Help · notifications · language · theme · avatar | hamburger (mobile) · logo cell · title **+ subtitle** · lifetime chip · panel button (mobile) · streak · Help · notifications · avatar. No language, no theme |
| 02 | toasts are 56px / min-w 319 / radius 8 / `#6CE9A6` / ellipse glow | that is **this repo's** `toaster.tsx`. The prototype's own toast is radius 12 on `--pop` with `--e3` + an inset hairline and a 22px tinted icon badge (template 2877). Same 4200 ms |
| 06 §C | the Chrome extension's header entry point is designed | `openExtension` exists in `chromeVals():6425` but is **never rendered** — the design has no entry point for it |
| 02 | the dragged post card goes fully transparent, not 40% | the prototype is `opacity: dragId === p.id ? '.4' : '1'` (`calendarVals():6884`) — **40%** |
| 02 | the calendar grid is 24 hourly rows | true of *this repo* (`calendar.tsx:89`); the prototype's own grid is 08:00–20:00, 12 rows. Take the row's look from the design and the hours from the code |
| 06 §B | the repo already has lifetime **code redemption**, so only the purchase flow is new | the redemption *route* did not exist — `POST /billing/lifetime` was a 404 the UI silently mistranslated into "invalid code". The service behind it was complete; only the controller entry was missing. Added |

Three more `chromeVals()` values are computed and never rendered, the same way doc 04's setup
panel is: `openCommand` (the ⌘K search), `usageMeters` and `channelUsage`. The rail has no search
box and no usage meters. Do not build them from the doc.

Gaps in the design itself, to be filled rather than copied:

- Form fields have **no focus state at all** — one has to be invented before theming Stripe.
- The checkout's "subscription ended" notice paints an orange box (`rgba(251,146,60,…)`, hardcoded)
  with a red icon (`var(--warn)`). Needs a real amber token pair.
- The checkout trust row is `flex-wrap:nowrap` and plan-feature labels are `white-space:nowrap`;
  both overflow under German and French, which run ~35% longer than the mock's English.

---

### Step 7a · Prices and tiers — expand only

The owner chose the design's tier names and prices. Looking at the two tables side by side changed
how it had to be done: **the capability sets are identical, pair for pair.** STANDARD and CREATOR
are both 5 channels / 20 images / 3 videos / 2 webhooks / no team; TEAM and GROWTH match; ULTIMATE
and AGENCY match. Nothing about what a customer *gets* moves. Only the price does.

So this is not a rename, it is a new price list. Done as **expand only**:

- `CREATOR / GROWTH / PRO / AGENCY` added with the design's prices — 20 / 33 / 49 / 99.
- `STANDARD / TEAM / ULTIMATE` **kept, at their existing prices**, marked `retired: true`.
- The enum grew; nothing was removed.

The obvious-looking alternative — aliasing STANDARD to CREATOR — would have shown an existing
subscriber "CREATOR · \$20" while Stripe charged them the \$29 their subscription actually holds.
Stripe never reprices a live subscription retroactively. Keeping the old entry at the old number
means an existing customer sees what their invoice says, and only new subscriptions use the new
list.

`retired` is a flag on the pricing entry rather than a deletion because two different things read
this table: screens that **offer plans** must skip retired tiers, screens that **look up a
subscriber's tier** must not. Three places offer plans (`first.billing.component.tsx`,
`main.billing.component.tsx`, `impersonate.tsx`) — the first two now filter; the impersonation tool
deliberately still lists everything, since an admin may need to put someone on a legacy tier.

That reframing also means the enum's **contract phase may never be needed**. Retiring a tier for new
signups costs nothing. Dropping the value costs a data migration against live subscriptions, on a
deploy path that defaults to `prisma db push --accept-data-loss`.

**Writes still use the old values.** `organization.repository.ts:30` and `organization.service.ts:105`
give Stripe-less self-hosted installs `ULTIMATE`, and they still do. Reads understand both names
already; switching the write is the second phase, after the new code is known-good in production —
otherwise a rollback meets a database row its code has never heard of.

**Three numbers worth a second look, all recorded in the code where they live:**

- **CREATOR yearly is \$132**, 6.6× the monthly where the other three are exactly 8×. Doc 06 §B
  flags it as possibly a typo; taken from the design as instructed.
- **AGENCY keeps 100 channels, not "unlimited."** Doc 06 §B calls unlimited a new product decision,
  and a channel is recurring API load rather than a label. One number, whenever somebody owns it.
- **PRO's yearly moves 470 → 396.** PRO is the one tier that keeps its name, so unlike the other
  three there is nowhere to park the legacy price: an existing yearly PRO subscriber will see 396
  while Stripe keeps charging 470 until they change plan. It is the single place in this change
  where a displayed number can differ from an invoice.

**A bug caught on the way:** the paywall defaulted to `useState('STANDARD')`. With STANDARD retired
and filtered out of the plan list, it would have opened with a selection that was not on screen —
and the same for a plan stashed in `localStorage` by the marketing site. Both now fall back to
CREATOR. The lifetime code's "one tier up" ladder was also a two-branch conditional that only knew
STANDARD and PRO; it is now an explicit ladder that places a legacy subscriber on the equivalent
rung.

**Checks:** types 0 · api 134 · i18n 613 · routes 27. The local `Subscription` table is empty, so
there was nothing here to migrate — the phasing is for production, not for this machine.

## Running the backend from source here — and the bug that stopped it

The API can now be exercised locally, which is what makes any of the backend work verifiable. Three
things were in the way and all three are worth writing down.

**Postgres and Redis are not published to the host.** The running stack comes from
`docker-compose.yaml` (production topology), which exposes only the app on 4007. Rather than
recreate the user's containers, two throwaway `alpine/socat` bridges attach to the existing network
and forward 5432 → 15432 and 6379 → 16379. Nothing of theirs is touched and `docker rm` undoes it:

```
docker run -d --rm --name pq-pg-bridge --network postqueen-docker-compose_postqueen-network \
  -p 15432:5432 alpine/socat tcp-listen:5432,fork,reuseaddr tcp-connect:postqueen-postgres:5432
```

Then the API runs from source with `DATABASE_URL`/`REDIS_URL` pointed at the bridges and
`NEXT_PUBLIC_BACKEND_URL=http://localhost:3000` — the container sets that to the relative `/api`,
which `start.mcp.ts:50` feeds to `new URL()` and which only resolves behind the frontend's proxy.

**A real bug: the server cannot boot on Node 25 with Sentry disabled.**
`initialize.sentry.ts` imported `@sentry/profiling-node` at the top of the file while checking the
DSN *inside* the function. The import pulls a prebuilt native binding, there is none for Node 25, and
the process died before Nest started — on an install with no Sentry configured at all, which is most
self-hosted ones. The require is now inside the DSN check and wrapped, so a missing binding costs
profiling rather than the server. This is the second thing this migration has found that nothing
else could have: it is invisible to the type checker and to every screenshot.

**The token had to be re-signed.** The session cookie was signed with the *container's* `JWT_SECRET`,
which is not the value in `.env`; the source API rejects it. `dotenv -e .env -- node -e "…sign(…,
process.env.JWT_SECRET)"` mints one without the secret ever appearing in a command or in a transcript.

With that up, **provider categories are verified end to end**: `/integrations` returns a category on
all 34 providers (16 social, 6 chat, 5 publishing, 4 video, 3 business) and the Add Channel grid
renders the design's five groups. The fallback was proven too — before the API knew about
categories, the same grid rendered as one ungrouped list with every provider present.

## The local backend runs from an image, not from source

Worth knowing before anyone plans backend work here: the `postqueen` container mounts only
`/config` and `/uploads` — **no source**. It runs a built image, so every change under
`libraries/nestjs-libraries` is invisible to the running API until the image is rebuilt. Provider
categories, `pricing.ts`, the tier enum and any new endpoint all live there.

The fast loop is `pnpm run dev:backend`, which runs the API from source; the frontend then needs to
point at it instead of `:4007`. Until that happens, backend changes can be written but not
exercised — and this migration's whole discipline is that unexercised is not verified.

## Open questions for the owner

Written down rather than asked, at the owner's instruction, so work could continue overnight. Four of
the original six are now closed by decisions the owner gave; the two still open are both about
wording and money, not code.

### Still open

**A. CREATOR yearly is \$132 — 6.6× the monthly, where every other tier is exactly 8×.** Doc 06 §B
flags it as possibly a typo. The design's figure was taken as authoritative and is live in
`pricing.ts`; if it was a typo the fix is one number. Nothing else depends on it.

**B. Trial copy the backend cannot honour.** The design writes "4 months free" where the repo's
string is `billing_20_percent_off`. The discount is a Stripe coupon, so the copy has to match
whatever the coupon actually is or customers are told something untrue. *Taken in the meantime:* the
trial and discount surfaces are restyled, the strings stay the repo's.

### Raised since, and waiting on you

**C. `apps/commands` cannot boot, and predates this branch.** `agent.run.ts` calls
`AgentGraphService.createGraph`, which no longer exists, so the app fails to build; and
`CommandModule` imports no Temporal module, so `DatabaseModule`'s `NotificationService` cannot be
injected. Nothing here touched it. It matters because a one-off job like the tier migration belongs
there; `scripts/migrate-tiers.mjs` exists instead and says so.

**D. The agent's greeting still says "from the left menu" / "from the right menu".** True on desktop,
no longer true on a phone, where both are drawers now. It is the agent's own copy and rewriting copy
during a restyle is the thing this migration has refused to do everywhere else.

**E. The design's modal → inline connect pane is declined, not deferred.** It needs a channels page
this repo does not have — channels are a column on the calendar. Reasoning in full below.

### Closed

**1. Renaming the tiers is a data migration, not a restyle.** *Decided: full rename, and the design's
prices.* Done in three parts. The schema gained CREATOR / GROWTH / AGENCY beside the old values;
`pricing.ts` carries the design's \$20 / \$33 / \$49 / \$99 with the old tiers marked `retired`;
and the code was finished off — a team-member gate that had silently stopped applying, a `?plan=`
list that was dropping the new tiers, and three places still naming ULTIMATE. Live rows are moved by
`scripts/migrate-tiers.mjs`, which the owner runs. **The old enum values are permanent** — `db push`
cannot drop one without taking the column with it, and `retired: true` already stops them being sold.

**2. The lifetime purchase flow does not exist — and neither did the redemption route.** *Decided:
build the purchase, not the scarcity counter.* The redemption half turned out to be the real story:
`POST /billing/lifetime` was a 404 the UI mistranslated into "invalid code". Route added. The
purchase half is blocked on Stripe keys. The countdown and the "37 of 200 left" counter are **not**
built and will not be: a timer counting down to nothing is a lie in the UI, not a visual detail.

**3. Grouping the provider grid needs a mapping this repo does not have.** *Closed by building the
mapping in the right place.* The category lives on the provider class, not in a hand-kept list, so a
provider added without one lands in **Other** rather than vanishing. Verified by counting, not by
looking: `--count [data-provider]` reports **34**, exactly what `GET /integrations` serves.

**4. `text-white` on neutral surfaces.** *Closed by auditing all 95, not by pattern-matching.* Six
were genuinely broken in the light theme and are fixed; 88 are correct as they are. The one that
mattered most was written during this migration — the tour's Next button at 1.36:1 — and it was
invisible until the screenshot tool was taught to report `color`.

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

---

### Step 2 · Shell — done

The frame the whole app sits in. Before this the rail was an 80px purple gradient column running the
full height with the header inside the content beside it; there was no collapsed state, no phone
behaviour at all, and the org switcher was a globe icon with a hover-only menu that could not be
reached from the keyboard.

**What changed structurally.** The header is now a 56px bar across the whole window, with a logo
cell on its left sized to the rail so the cell's edge continues the rail's own hairline. Under it
sit the rail and the page. The rail is 236px, collapses to 60px icons (cookie `railCollapsed`, the
same idiom the calendar's own column already uses), and below 760px becomes a 264px overlay drawer
opened from a hamburger. Nav is two groups — an unlabelled one and a collapsible **More** — matching
the design.

| Piece | Where it went |
| --- | --- |
| Logo | rail top → **header**, left cell |
| Org switcher | header icon → **rail footer**, click-to-open panel |
| Theme toggle | header icon → **user menu**, as a segmented light/dark control |
| Chrome extension link | header icon → **Help menu** |
| Sentry "report a bug" | header icon → **Help menu** |
| Billing | rail nav row → the rail's **Upgrade row** (and a gated row in the user menu) |
| Invite | rail footer → **removed**; Settings → Teams already owns inviting (`teams.component.tsx`, "Add Member" + invitation link). This was a shortcut to `/settings?tab=teams`, not a capability of its own |
| Plugs, Affiliate | first nav list → **More**, Affiliate last |
| Create Post | unchanged — still portalled into the header slot by `launches.component.tsx` |

**Every gate was carried over verbatim,** including two that are arguably bugs and were left as
bugs because fixing them is a behaviour change, not a restyle:

- `f.name === 'Billing' && user?.isLifetime` compares the **translated** label, so the lifetime
  exclusion only fires in English.
- The old "hide the whole first menu" condition is `user?.orgId && (user.tier !== 'FREE' || …)`, and
  `user.tier` is a `PricingInnerInterface` object — the comparison is always true at runtime. It now
  travels per item as `requireOrg`, because Affiliate moved into a group whose other members carry
  it and Affiliate never did. Same result, same two `@ts-ignore`s.

The rail's Upgrade row keeps `billingEnabled && !user?.isLifetime`, which is a strict superset of the
old Billing nav entry's gate — merging them reaches nothing new. `useMenuFilter()` is now the single
definition of the per-item gate and the user menu applies it too, so that menu cannot reach a screen
the rail hides.

**Toaster and modal shell.** The toast moves to the prototype's own design — `--pop` surface,
12px radius, `--e3` plus an inset hairline, a 22px tinted icon badge — and keeps its EventEmitter
API, its 4200 ms life, its singleton rule and its `success`/`warning` types untouched (104 call
sites). Its warning icon uses `--amber`, not `--warn`: the design paints an orange badge and then
reaches for the red token, which is the gap already recorded above and the reason `--amber` exists.
The modal shell only gained a shadow, the display font on its title and a real close button in place
of the leftover Mantine class names — the store, `useModals()`, `askClose`, Escape, the
`removeLayout`/`fullScreen` paths and the `.blurMe` blur are all as they were.

**Two things the class-name coupling forced.** `new-modal.tsx` and `check.payment.tsx` find the
surfaces to blur with `querySelectorAll('.blurMe')`, and `header-slot.tsx` finds its portal target
with `getElementById('pq-header-action')`. Both survived the restructure; renaming either would have
broken silently.

**New tokens:** `--navActive` and `--navRowHover`, the rail's two states. The prototype writes them
as literals and uses the same value in both themes, so they are one pair here. `--navRowHover` is
applied as an inset ring rather than a background, so it tints whatever the row sits on.

`.brand-rail` was deleted from `global.scss` — the rail is a neutral `--rail` surface now and
nothing else used the gradient. `layout/chrome.extension.component.tsx` was deleted too; its
condition (`billingEnabled && extensionStoreUrl`) moved intact into the Help menu row.

**What the design asks for that this repo cannot answer** — flagged, not built:

- **Setup tour, Documentation, Keyboard shortcuts** in the Help menu. Setup tour is real here — it
  opens the existing onboarding modal via `/launches?onboarding=true`, which is where `<Onboarding/>`
  is mounted. The other two have no target and render at the design's own locked opacity with
  `aria-disabled` and no handler, so the menu reads complete without a row pretending to work.
  Wiring them is follow-up work.
- **The streak popover** (7-day grid, "Longest: N days"). The repo has `user.streakSince` and
  nothing else — no best streak, no per-day data. The existing tooltip stays.
- **Posts, Channels, Social Sets, Signatures, Auto Post, Webhooks as nav rows.** They are Settings
  tabs here, not pages.
- **The rail's primary button ("Connect PostQueen").** It opens a Connections directory that does
  not exist in this repo. The button lands with that screen in step 3 rather than pointing at a 404.
- **The "Billing & invoices" and "Founding member" variants of the Upgrade row.** There is no AGENCY
  tier here, and lifetime users have no billing row at all — both branches are unreachable.

**Checks:** types 0 errors · api **134 unchanged** · routes **27 unchanged** · i18n **585 → 607**.

The i18n baseline was rewritten deliberately. 23 keys added: the eight page subtitles the design puts
under the title, the Help menu's labels, `theme`, `organizations`, `day_streak`, `menu`,
`main_navigation`, and the two sidebar collapse labels. One key removed: `invite`, with the rail
button it belonged to. English fallbacks come from the prototype; the other 13 languages fall back to
English until they are translated.

Worth knowing for later steps: `ui-migration-check.sh` finds keys with a **line-scoped** grep, so a
`t(` call that Prettier wraps across lines becomes invisible to the guard. Four of the subtitles were
written wrapped at first and the guard silently did not see them. They now sit one per line behind a
`prettier-ignore`, and any future step should keep `t('key', 'English')` on one line.

**Visual:** the eight baseline screens at 420 / 900 / 1440 in both themes, plus the collapsed rail,
the phone drawer open, the user menu open, the Help menu open, and `/launches` and `/settings` under
Hebrew for RTL. Read against the prototype rather than counted — this step is *supposed* to change
every pixel of the frame.

The frame matches: 56px header on `--rail` with the logo cell sized to the rail and its edge
continuing the rail's hairline, title over subtitle, Help · notifications · avatar to the right; the
rail's two groups with **More** collapsible; the footer's Settings row taking the active tint on
`/settings`; 60px icon-only collapse with tooltips. RTL mirrors cleanly — rail on the right,
hamburger on the right, drawer entering from the right, no overflow.

Three things this install cannot show, all correct behaviour rather than bugs: **Affiliate** is
absent (`affiliateUrl` unset), the **Upgrade row** is absent (`billingEnabled` off), and the **org
switcher** is absent (one organisation). For the same reason the Help menu here has only *Setup
tour* live — *Contact support*, *Report a bug* and *Browser extension* each need their own variable
(`isChatBase`, `sentryDsn`, `extensionStoreUrl`) and none is set locally.

**One real bug, found by the screenshots and fixed.** The drawer was `absolute` inside the chrome
row so it would sit correctly under the impersonation bar and the announcement banner. But a page
taller than the window makes that row grow, and the drawer grew with it — hanging its own footer
(Settings, org switcher, Upgrade) below the fold, unreachable, on exactly the pages where the
content is long. It is now `fixed` and measures the row for its top edge instead of assuming 56px,
so it stays viewport-bounded whatever is stacked above the header. The parked drawer also sits a
full width outside the viewport, which in RTL is off the *right* edge and does widen the page, so it
renders inside a clipping layer.

**Not captured, and why:** the calendar at 420 has its channel column and day headers overlapping.
That is **not** this step — step-1b's own baseline shows the identical overlap, and the shell change
gives the page more room, not less. It belongs to the calendar's screen step. The "N" disc in the
bottom-left corner of every shot is the Next dev-tools badge, not the app.

**Three gaps in the screenshot tool closed on the way**, each of which had made a state
unverifiable:

- `PQ_COOKIES` — cookie-driven chrome (the collapsed rail; later, the calendar's collapsed channel
  column) could not be photographed at all, because the tool only ever set `auth` and `mode`.
- `--click` — nothing that needs an interaction could be reached: menus, the drawer, a dialog and
  the blur behind it, a toast. Selectors are clicked in order after the page settles, and a selector
  that matches nothing is an error rather than a photograph of the resting page.
- **A dead server is now an error.** The dev server died mid-run and the tool wrote six screenshots
  of Chrome's *"This site can't be reached"* — that page loads instantly and then sits perfectly
  still, so the network-idle check was entirely happy with it. `Page.navigate`'s `errorText` is now
  checked. This is the same failure the flat-3.5s timer had in step 1a, in a new disguise: the
  harness has to say when it is lying, because a screenshot that looks plausible will otherwise
  become the reference.

**Three defects found reviewing this step afterwards, fixed before the calendar started:**

- The `railCollapsed` cookie had no expiry, so `react-use-cookie`'s 7-day default applied and the
  collapsed rail sprang back open a week later. This is the *same* trap `mode.component.tsx` already
  records against the theme cookie, written down and then walked into anyway. The calendar's own
  `collapseMenu` cookie has it too and is fixed in step 3, where that file is open regardless.
- **A frame of the desktop layout on phones.** `use.viewport.tsx` measures in `useEffect` and the
  server has no width, so it renders at 1440: the browser painted the 236px rail and only then
  snapped to the drawer. The mechanism landed in step 1 but nothing consumed it until now, so the
  flash is this step's to own. Both effects are now isomorphic layout effects, which run before
  paint.
- **The drawer was a dialog to the eye only.** Opening it left focus behind the scrim, Escape did
  nothing, and closing it dropped focus at the document root. It now takes focus on open, closes on
  Escape, restores focus to whatever opened it, and carries `role="dialog"` + `aria-modal` while
  open. No focus trap — the scrim and Escape are exit enough, and trapping is a larger change than
  this step should carry.

**Also worth writing down, since it explains a piece of chrome that looks broken and is not:** there
is no way to name an organisation. The name comes from the *Company* field at registration
(`auth/register.tsx:176` → `organization.repository.ts:277`) and nothing in the app or the API can
change it afterwards; there is no create-organisation endpoint either. A second organisation only
appears when somebody invites you from Settings → Teams. So the rail's org switcher is invisible to
most accounts by design, and `layout/organization.selector.tsx` is the only file in the frontend that
touches `/user/organizations` or `/user/change-org`. Naming and creating organisations is real
missing product, not a migration task.

---

### Step 3 · Calendar — done

The app's landing screen, and the largest one. Before this it was a grid of rounded tiles separated
by 4px gaps, with each post card wearing a coloured bar of actions across its top.

**What changed.** The grid is hairlines now: a 72px hour column and seven day columns that draw the
lines with their own borders, 54px sticky day headers with the current day as a brand pill (plus the
month chip at a month boundary), 108px cells, and past hours filled with a diagonal hatch and
`cursor: not-allowed`. The post card lost the top bar — it is a `--pop` surface with a channel-tinted
accent stripe, one line of channel · time · tag · status, two lines of content, and the actions
floating bottom-right on hover. Month view follows the same language. The toolbar's three switches
became the design's segmented control: a `--settings` trough with a raised `--inner` pill.

Cell states — empty-vs-filled hover, the "+ 14:00" invitation, the scroll-on-hover for a stacked
cell — are CSS on `[data-cell]` attributes rather than React state. Dragging the pointer across a
7×24 grid would otherwise re-render it on every move, and it is how the design expresses them too.

**Behaviour is untouched:** `useCalendar()`, every SWR key, `react-dnd`'s drag and its
"this post was already published — reschedule or just update?" dialog, the post actions and their
gates (statistics hidden for X when `disableXAnalytics`, `releaseId === 'missing'` routing to the
missing-release dialog, debug JSON for superadmins only), `find-slot`, `SetSelectionModal`, the
creation-method badge, and the customer selector.

**Three things the screenshots caught, all fixed:**

- Taking the design's `minmax(132px, 1fr)` literally **lost Sunday at 1440**. The design's calendar
  has no channel column beside it; ours does, and seven 132px columns no longer fit. The floor is
  84px — still enough to stop the collapse, small enough to get out of the way.
- A 62px hour column **wrapped "12:00 AM" onto two lines** in a 12-hour locale. 72px.
- **The 420px overlap is gone** — and it was two separate faults, not one. The grid used
  `minmax(0, 1fr)`, so columns collapsed to nothing and the day headers printed on top of each other;
  and the channels column was `w-[260px]` with no `shrink-0`, so in a squeezed row it spilled its own
  centred text out of both sides of its box. The grid now has a floor and scrolls sideways, and below
  760 the channels column is always the 100px icon rail. This defect predates the migration — step
  1b's baseline has it too.

Also fixed here: the calendar's `collapseMenu` cookie had the same missing expiry as the rail's.

**Deliberately not built.** The **Queue panel** — Drafts / Scheduled / Posted over the same posts —
is the design's headline for this screen, and it occupies the slot this repo gives to the channels
column. Moving it now would strand channel management (Add Channel, and the per-channel menu:
preview, settings, time slots, bot picture, disable, delete) with nowhere to live, because the design
keeps channels on a Channels page that arrives in milestone 5. The Queue panel lands with it. The
design's **channel filter chips** are new behaviour with no counterpart here and are not built. **Touch
drag** stays undesigned and unbuilt: `react-dnd`'s HTML5 backend is mouse-only, and adding a touch
backend is a new dependency plus a scroll-gesture conflict, which is not a restyle.

One deviation worth naming: the design's card shows only the platform icon. This one keeps the
account avatar with the platform as a small badge, because with two accounts on the same platform
the avatar is the card's most important fact.

**Checks:** types 0 · api 134 · i18n 607 · routes 27 — all unchanged. No new strings: the whole
screen was restyled without inventing a word of copy.

---

### Step 4 · The old brand palette, and the composer — done

**The larger finding.** 135 hex literals were still hardcoded in components, and the biggest group
was the *old* brand purple: `#612BD3` in 47 places across backgrounds, borders and text, plus its
hover `#5520CB` and the old accents `#FC69FF` / `#D82D7E` / `#AA0FA4`. Step 1b moved the token layer
to the redesign's `#7c3aed`, but none of these went with it — so the composer's submit button, the
"Post now" button, the agent page's primary action and two dozen other controls were still painting
the previous brand next to a UI that had moved on. Nobody would have caught this from the token
diff; it only shows up screen by screen.

105 of them are now tokens (`pqBrand`, `pqBrandHover`, `pqPink`, `pqWarn`, `pqSoft`, `pqFocused`,
`pqOk`). What is deliberately left as a literal: platform colours (X's `#1d9bf0`), gradient stops,
and a handful of one-offs on screens the redesign has not reached yet.

**Composer.** Restyle only, and conservatively, because this install has no connected channels and
the composer therefore cannot be opened here — it is verified by reading, not by screenshot. The
frame takes the design's 24px modal radius on `--inner` with a real elevation, the two 65px headers
become hairline-separated bars in the display face, and three `text-white` labels that sat on
neutral surfaces were fixed — those were **invisible in the light theme**. Provider settings,
character limits, previews, TipTap and CopilotKit are untouched, as doc 05 requires.

**Empty states.** `plugs.tsx` and `platform.analytics.tsx` set their empty-state headline at
`text-[48px]` — three times anything in the redesign's scale, and it read as a broken page rather
than a quiet one. Both are now a constrained illustration, an 18px display heading and a muted
supporting line. Same strings, same button, same behaviour.

**Checks:** types 0 · api 134 · i18n 607 · routes 27 — all unchanged.

**Two things this install cannot show, recorded so the gap is not mistaken for completion:** the
composer (needs a connected channel) and every billing screen (`billingEnabled` is off here, so
`/billing` redirects to the auth screen). Both were restyled by reading the code. They need a pass
with seed data and billing switched on before anyone calls them verified.

---

### Steps 5 & 6 · Add Channel, Media, Integrations — in progress

**Add Channel now photographs.** The dialog cannot be reached by URL, so it had never been checked;
`data-pq="add-channel"` on its button plus the tool's new `--click` gets a screenshot of it. It
confirms the modal shell from step 2 doing its job on a real dialog: 24px radius on `--inner`, the
display face on the title, the new close button, and the chrome blurred behind it. All 34 providers
render.

~~The design's **grouping** of that grid is deliberately not built~~ — **superseded.** The grouping
landed with the category work: the risk described here was a hand-written provider→category map, and
the category now comes from the provider class itself, so a provider added without one falls into
**Other** rather than vanishing from the only screen that can connect it.

It is now verified by counting rather than by looking, because "did a provider quietly fall out" is
a counting question. `--count [data-provider]` reports **34**, which is exactly what
`GET /integrations` serves. The 35th class declaring a category is `mastodon-custom`, whose
registration is commented out at `integration.manager.ts:76` — upstream, not us. Groups render as
SOCIAL / CHAT & COMMUNITIES / VIDEO & STREAMING / BUSINESS & PORTFOLIO / BLOGS & NEWSLETTERS, and
the heading is suppressed in the onboarding variant, which uses a 9-column grid.

Still open from this step: the design's **modal → inline pane** conversion for the connect flow.

**Media** and the **Integrations** page came through the palette sweep correctly; Media's empty state
joined the others at the design's type scale (18px display heading, 13.5px muted body) instead of a
20px heading with a 16px body at 60% opacity.

**Checks:** types 0 · api 134 · i18n 607 · routes 27 — unchanged.

**A full responsive sweep** — 7 screens × 420 / 900 / 1440 × both themes, 42 shots — reports
**zero horizontal overflow**, which is what the step-0 baseline claimed and what the migration has to
keep true.

It also surfaced a defect the migration did not cause and has not fully fixed: **the AI agent page
is unusable at phone widths.** It is three columns — channels 260px, chat, threads 260px — so at
420 the two fixed columns take everything and the chat is squeezed to nothing. Step-1b's baseline
shows the same page equally broken (worse, in fact: the old 80px rail took another slice), so this
predates the redesign.

Half-fixed here: below 760 the channel column now collapses to its 100px icon rail, the same rule
the calendar got, which gives the chat back 160px. That is not enough on its own — the threads
column is still 260px with no collapsed mode, so the chat has roughly 60px. The real answer is the
design's own: side panels become off-canvas drawers below 760, opened from a header button
(`panelTransform` / `togglePanelDrawer` in `chromeVals()`). The drawer mechanism already exists from
step 2 and can be reused, but wiring a second one into a chat surface that cannot be exercised on
this install — the copilot endpoint 503s locally with no model key — is not something to do blind.
Recorded rather than guessed at.

---

### Step 8 · Feature-gating audit — done

Doc 03's gate table walked against the code after the shell moved everything around. **Nothing has
drifted.** The four lifetime rules are all intact and in their new homes: the rail's Upgrade row
still carries `billingEnabled && !user?.isLifetime` (`rail.tsx:133`); the Billing entry is still
filtered by `f.name === 'Billing' && user?.isLifetime`, now from `useMenuFilter()`, which the user
menu applies too; the channels column still prints `{Tier} tier` only for lifetime users
(`launches.component.tsx:618`); and `main.billing.component.tsx:448` still redirects them away.

The Settings tabs match the table exactly — Teams on `team_members && isGeneral && isOrgAdmin`,
Webhooks on `webhooks`, Auto Post on `autoPost`, Sets and Signatures on `tier.current !== 'FREE'`,
Developers on `public_api && isGeneral && showLogout && isOrgAdmin`.

Doc 06 §D1 calls the editor's AI Image / AI Video pair "the gate that was wrong longest" and says
they are gated by `tier.ai` **together**, not by `image_generator` / `generate_videos`. Confirmed:
`media.component.tsx:743` and `:858` are both `!!user?.tier?.ai`. The doc is right and the code is
the authority, so it stays.

### The baseline's "billing" screenshot was never the billing screen

`/billing` bounces to `/auth` on this install — the page's two endpoints are ADMIN-gated, the local
backend rejects them with billing disabled, and `layout.context.tsx` then clears the session and
sends you to the login screen. It has done this since before the migration: **step-0, step-1a and
step-1b all captured the signup page under the name `billing-*.png`**, and every comparison since
has been quietly comparing signup pages to signup pages. They matched, so nothing complained.

Same shape as the "This site can't be reached" screenshots, one level subtler: a redirect is a
*successful* navigation, so neither the idle check nor the new `errorText` check has anything to
object to. `ui-shot.mjs` now compares the landing pathname with the requested one and fails the run
when they differ:

```
⚠ /billing redirected to /auth — billing-1440-dark.png is not the screen you asked for
```

The general lesson, now three times over: **this harness has to say when it is lying.** Every check
added so far came from a screenshot that looked perfectly plausible and was not what it claimed — a
loading skeleton, an error page, and now a redirect. The baseline's "8 screens" is really 7 screens
plus one that has never rendered here.

The redirect check **warns, it does not fail the run**, and that distinction was earned within a
minute of writing it: the first thing it caught was `/agents → /agents/new`, which is the app
working as designed. Only a person can tell that apart from `/billing → /auth`. A check that cries
wolf is a check people learn to scroll past — which is precisely how the billing screenshot survived
three baselines.

### RTL: the app could not display a date range correctly, and it was CSS

Checking the new calendar grid under Hebrew found two things reading backwards: hour labels as
"AM 0:00", and — worse — the week 03/08–09/08 rendered as **"09/08/2026 - 03/08/2026"**. The range
was showing its end before its start, which is not cosmetic; it names the wrong week.

Both are bidi: a clock time and a date range are left-to-right tokens, not prose, so they need
`dir="ltr"`. Adding it changed nothing, which is where a screenshot stops being able to help — the
markup looked right and the pixels looked wrong, with no way to tell which end was lying.

So `ui-shot.mjs` gained `--probe <selector>`, which prints what the live DOM actually says. One run:

```
probe [dir="ltr"]: {"text":"03/08/2026 - 09/08/2026","dirAttr":"ltr","direction":"rtl", …}
```

The text was in the right order and the attribute *was* applied — and the computed direction was
still `rtl`. `global.scss` carried this:

```scss
html[dir='rtl'] [dir='ltr'] { direction: rtl !important; }
```

A rule that forces every element asking to be left-to-right back to right-to-left — the exact
opposite of what `dir="ltr"` means, and it applies to dates, times, URLs, code and phone numbers
alike. It predates the migration, nothing in the app sets `dir="ltr"` for it to have been protecting,
and while it was there **no markup could have fixed the reversed range**. Removed, with the reasoning
left in its place.

Worth saying plainly: this was invisible to every method used so far. It survived the type checker,
all four guard checks, and a screenshot review in two themes — the range looked like a plausible
date range. It took asking the DOM.

### Keyboard focus: it worked, and it was the wrong colour everywhere

Doc 06 §E asks for the keyboard path to be verified and nobody had. `ui-shot.mjs` gained `--tab N`,
which presses Tab with real key events — `el.focus()` would not do, because `:focus-visible` (the
thing that decides whether a ring is drawn at all) only matches keyboard-initiated focus. It then
reports what `document.activeElement` is and what ring it has.

The tab order is sound: logo → Help → notifications → avatar → collapse → Calendar → Agent →
Analytics → Media, in the order they appear. Nothing is skipped and nothing is trapped.

But every ring was **Chrome's default blue**, `rgb(0, 95, 204)` — legible, and a colour that appears
nowhere else in the product. The token layer shipped `--ring` for precisely this in step 1 and
nothing had ever used it. It does now, globally, at 2px with a 2px offset.

Eight of the first nine tab stops now draw `rgba(167, 139, 250, 0.5)`. The ninth — the avatar button
— keeps a near-white `2.5px` ring from somewhere that is not our CSS and not Mantine. It is left
alone deliberately: the fix would be `!important` on a global focus rule, which would then stomp any
component that legitimately styles its own focus. One inconsistent ring is the smaller cost.

### One more palette finding

`text-customColor18` was on **50** descriptions — the grey line under a settings label. Its token is
`#aaaaaa` in dark and **`#000` in light**, so in the light theme every description was rendering as
loud as the label it explains. It is `--muted` now, along with 13 `border-customColor6` that already
pointed at `--line`. 63 replacements, and the label/description hierarchy reads correctly in both
themes for the first time.

**Checks:** types 0 · api 134 · i18n 607 · routes 27 — unchanged.

### Finishing the tier rename — a gate that had silently stopped applying

Step 7a renamed the tiers in the schema and in `pricing.ts` and stopped there. The half left behind
had three consequences, and **none of them tripped the guard**, because `ui-migration-check.sh` only
ever compiled the frontend. It compiles the backend too now
(`apps/backend/tsconfig.build.json` — the config the backend actually builds with; its
`tsconfig.json` is stricter and reports seven pre-existing errors in files nothing here touches).

**A feature gate lapsed.** `organization.repository.ts` blocked adding a team member when the org was
on `STANDARD`. STANDARD is retired, so a **CREATOR** org — the entry plan that replaced it — walked
straight through a gate written to stop exactly that, and could invite team members it does not pay
for. It reads `pricing`'s `team_members` flag now rather than naming a plan, so the next tier change
cannot reopen it. The guard on a subscription row *existing* is deliberate: that is what naming
STANDARD did, and it is the only reason a FREE org is not newly caught.

**`?plan=creator` was being dropped.** `utm.saver.tsx` kept a hardcoded list of the four old tiers, so
a visitor arriving from the marketing site having chosen one of the three new plans lost that choice
without a trace. Derived from `pricing` now, retired tiers excluded — a link offering a plan that is
not for sale should not work.

**Three places still named ULTIMATE.** Two are read-time fallbacks for a self-hosted install with no
Stripe keys (`organization.service.ts`, `users.controller.ts`); one actually writes it
(`organization.repository.ts`, the seeded lifetime org). All three are AGENCY now — both are 100
channels, so nothing changes except that the plan named is one that can still be bought.

The stale unions (`user.context`, `public.controller`, two Stripe webhook metadata casts, six in
`main.billing.component`) now come from two exported types in `pricing.ts`: `PaidTier`, what a
subscription row can hold, retired included; and `AnyTier`, that plus FREE.

### Moving the live rows — and why it is a script

`scripts/migrate-tiers.mjs`. STANDARD → CREATOR, TEAM → GROWTH, ULTIMATE → AGENCY; PRO kept its name.

**Not a Prisma migration**, because the owner confirmed the deploy path is
`prisma db push --accept-data-loss`. Nothing in `migrations/` ever runs, so a migration file would
look right, be committed, and silently never execute. This also **cancels phase 3** of the plan: an
enum value cannot be dropped without recreating the type, which under `--accept-data-loss` takes
`Subscription.subscriptionTier` with it. The retired values are permanent, and the schema comment
says so instead of implying somebody will get round to it.

**Not a `nestjs-command` task either**, which is where one-off jobs belong here — because that app
cannot boot. Two independent reasons, both older than this branch: `agent.run.ts` calls
`AgentGraphService.createGraph`, which no longer exists, so it fails to build; and `CommandModule`
imports no Temporal module, so `DatabaseModule`'s `NotificationService` cannot be injected. A fix for
the second was written and then reverted — repairing an unrelated broken app is not this migration's
scope, and shipping an unverified fix to it would be worse than leaving it.

**Rehearsed against the dev database inside a transaction that was rolled back:**

```
seeded:  { STANDARD: 1, TEAM: 1 }
  moved 1 × STANDARD -> PRO
after:   { TEAM: 1, PRO: 1 }
rolled back. subscriptions now: 0, probe orgs left: 0
```

The rehearsal moves STANDARD → PRO rather than the real pairs because of what it turned up: **the
expand step edited `schema.prisma` but no database has had it applied.** Postgres still rejects the
new values outright —

```
invalid input value for enum "SubscriptionTier": "CREATOR"
```

— which is an ordering constraint rather than a defect: `pm2-run` runs `prisma-apply` before starting
anything, so a normal deploy adds the values first. The script documents it as a prerequisite. Run it
**after** a deploy, never before.

### Regression sweep after the tour, the colour fixes and the agent drawers

7 screens × 420 / 900 / 1440 × both themes — 42 shots — **zero horizontal overflow**, no redirects,
no dead pages. Same result the earlier sweep gave, which is the point: that sweep is what caught the
agent page in the first place.

### The agent page on a phone — finished, and the inline-pane question answered

**Finished.** The earlier half-fix collapsed both side columns to a 100px icon rail below 760, which
left the chat about 220px of a 420px screen. The note said that was "not enough on its own";
photographing it showed what it actually means — two or three words a line, and a message box the
shape of a bookmark.

Both columns are off-canvas drawers below 760 now, and the chat takes the full width. The pattern is
`rail.tsx`'s, for the reasons `rail.tsx` learned them: the drawer top is **measured** so it opens
under the chrome rather than over it, the parked panel is **clipped** so it cannot widen the page in
RTL, Escape and the scrim both close it, and `role="dialog"` is set only while it is open. Inside the
drawer each column is the full expanded list rather than the icon rail, and the desktop collapse
chevron is hidden — there is nothing to collapse to in a drawer.

Desktop is untouched by construction: `AgentDrawer` is a passthrough when inactive, and the 1440
screenshot is the same three columns as before. The reason the earlier note gave for not doing this —
that the chat surface cannot be exercised here, since copilot 503s without a model key — turned out
not to block it: the **layout** is verifiable even when the chat content is not.

**Not changed:** the agent's greeting still reads *"from the left menu"* / *"from the right menu"*,
which is now only true on desktop. That is the agent's own copy, and rewriting copy during a restyle
is the thing this migration has refused to do everywhere else. Flagged for the owner.

**The design's modal → inline connect pane is not built, and should not be.** The prototype's connect
flow is a wizard (`chAdd` → `addStep` → `addContinue`) living on a `page: 'channels'` at
`max-width: 760`. This repo has **no channels page**: channels are a column on the calendar, and
Add Channel is a modal. Building the pane means creating a route that does not exist, moving channel
management off the calendar page where users do it today, and rebuilding the connect step as a
wizard around OAuth redirects and per-provider custom-field forms. That is an information-architecture
change, not a restyle, and it is exactly the case the migration rule covers — *the design implies
structure the code does not have, so raise it rather than implement it silently*. The modal is
restyled, grouped, counted and photographed; it does the job.

**Checks:** types 0 · api 134 · routes 27 unchanged. **i18n 628 → 629** — `conversations`, the label
on the second drawer toggle.

### The `text-white` audit — and one I had just written myself

95 uses. The interesting one was mine: the tour's Next button was `bg-pqBrand` with
`text-pqUpgradeFg`, and `--upgradeFg` is **not** a text-on-brand token — it is the rail's Upgrade
label, drawn on the rail, which is why the light theme sets it to `#6d28d9`. Probed:

```
light   fg #6d28d9  on  bg #7c3aed    ≈ 1.36:1
dark    fg #b9a8fb  on  bg #7c3aed    ≈ 2.3:1
```

Unreadable in light, poor in dark, and invisible in a screenshot until the tool was taught to report
`color` at all. There was no token for "text on a brand-filled surface", so `--onBrand` was added —
`#ffffff` in both blocks, because `--brand` is `#7c3aed` in both. Now 255,255,255 on 124,58,237 in
both themes.

The other 94 split three ways, and **most of them are correct**:

- **55** sit on a permanently coloured surface — brand buttons, `bg-forth` pagination (`--color-forth`
  *is* `--brand`), the logo crown, badges handed a colour, one deliberate `mix-blend-difference`.
- **33** are on fixed greys, gradients, or the public preview page's own dark canvas.
- **6** were genuinely broken: `text-white` with no background of its own, inheriting a surface that
  flips with the theme.

| file | what |
| --- | --- |
| `media.settings.component.tsx:430` | back button, `hover:text-white` with **no hover background** — hovering made it vanish |
| `top.title.component.tsx:48,50` | expand / collapse icons |
| `manage.modal.tsx:105,532` | settings icon and settings chevron |
| `editor.tsx:378,403` | the create-set lock overlay, sitting on `--settings` = **`#e9e9ef`** in light |

All six are `text-pqText` now. The four composer-internal ones are reasoned from the token graph
(`bg-newSettings` → `--new-settings` → `--settings`), **not photographed** — that surface still needs
a connected channel, same as step 4.

Deliberately **not** done: renaming the 55 legitimate ones to a token. `text-white` is a utility, not
a hex literal; the rule the migration actually keeps is "no hex literals in components", and a
55-site rename buys no user-visible change while adding a regression surface.

**Checks:** types 0 · api 134 · i18n 628 · routes 27 — unchanged.

### Step 9 · The product tour — done

Doc 04's six-step spotlight, rebuilt against this repo. `tour.tsx` is a fixed
overlay that reads `getBoundingClientRect()` off `[data-tour="…"]`; nothing is
re-parented, because every target sits inside a scrollable column.

**Four of the design's six targets do not exist here.** Mapped to what does:

| design | here | why |
| --- | --- | --- |
| `cal-grid` | the calendar grid | same thing |
| `posts-panel` | the view switcher | we have no side panel. "Every post in one queue" is the **List** view (`calendar.context.tsx:61`), so the copy says so |
| `connect-pq` | Settings → MCP config block | the MCP surface is `PublicComponent` in Settings, not an `aiagents` page |
| `connections-page` | Settings → MCP client list | as above |
| `nav-channels` | the channels column | **our rail has no Channels entry** — channels are a column on the calendar page |
| `platform-grid` | the Add Channel button | the design opens the connect pane; the tour does not open modals (see below) |

Reordered to 1-2-5-6-3-4 so the calendar steps run together: **one** navigation
instead of the design's three, same six steps, same story. Steps 5 and 6
deep-link `/settings?tab=api` — the tabs already support it
(`settings.component.tsx:83`) — so the step's "am I on the right page" test
compares query params, not just the pathname.

**Deliberate deviations from the prototype:**

*It has no way out.* `tourSkipDisplay` is computed in `setupVals()` and
hardcoded to `'none'` — a fourth "computed and never rendered" value, alongside
`openExtension`, `openCommand` and `usageMeters`. An overlay that covers the
whole app with no exit is not shippable, and doc 06 §E asks for Esc anyway. Esc
leaves, the scrim is clickable, and Skip is a real button.

*It polls.* `setupVals()` runs `setInterval(() => this.syncTour(), 240)` and
never clears it. This uses `ResizeObserver` + `requestAnimationFrame`, with a
250 ms settle pass that runs **only while a step is live** and tears down on
unmount — as doc 06 §E asks.

*It drives app state.* Each prototype step patches `page`, `drawer`, `sheet`,
`chAdd`. Here the tour changes **the route and nothing else**. It does not open
modals or panels on the user's behalf: `useModals` has 104 call sites and a
tour that reaches into them is a tour that can leave the app in a state the
user did not ask for. Step 6 therefore points at the Add Channel button rather
than forcing the connect pane open.

*Card placement for a large target.* The prototype always centres the card
**inside** the target, on top of the content it is describing. This tries to
the right first, then below, and only centres when neither fits. `cal-grid`
keeps the design's 54% / 30% offset — the grid is mostly empty, so a card
inside it hides nothing.

**The ghost demo (`startCalDemo` / `runGhost`) was not built.** Doc 04 marks it
optional and says to drop it if it fights the real drag layer. It would drive
`dragId` through `react-dnd`'s state to fake a drag; that is exactly the kind
of reaching-into-app-state the paragraph above rules out. The auto-scroll it
existed to provide is kept.

**A bug the screenshot alone would not have caught.** The first render looked
plausible but the app behind the spotlight was not dimmed at all. Probing the
live ring reported:

```
shadow: "rgba(124, 58, 237, 0.082) 0px 0px 0px 1.46891px, …"
```

— not the `0 0 0 9999px var(--tourScrim)` that was set inline. `pqTick` animates
`box-shadow` to make the ring pulse, and **a CSS animation beats an inline
style**, so the ring and the scrim silently fought over one property and the
scrim lost. The scrim is four rects around the hole now, and the ring keeps its
pulse. This is why `--probe` was extended to report `boxShadow`, `zIndex`,
`backgroundColor` and the element's rect.

**One thing the design's rule cannot fix.** On step 5 the card still overlaps
its target at 1440×900. The MCP block is 903×416 and is the **last card on the
page**, so `scrollIntoView({block:'center'})` cannot centre it — there is
nothing below to scroll past — and 176px of card does not fit above or below it.
The prototype has the identical constraint. Left as is and recorded rather than
special-cased.

**Persistence is `localStorage`, not a column.** `pq-tour-seen`. Dismissing a
tour is a per-browser UI preference; it does not justify a Prisma migration on
a production database, and the enum work in step 7a is a reminder of what that
costs. It is wrapped in try/catch — Safari private mode throws.

Entry points: **Help → Replay tour**, onboarding's **Get Started**, and
`?tour=true` (the same shape as the existing `?onboarding=true`, so support can
link someone straight into it — and so the tour is screenshot-testable at all).

**Checks:** types 0 · api 134 · routes 27 unchanged. **i18n 613 → 628** — fifteen
new keys, all of them tour copy (`tour_*`, `skip`, `next`, `finish`,
`replay_tour`), none removed. Baseline updated for that reason.

**Photographed:** step 1 at 420 / 1440 in both themes, step 5 and step 6 at 1440
dark. Step 6 is the `dim` step and correctly shows no ring with a full scrim.

### The lifetime route the frontend has always called did not exist

Step E was supposed to be "build a purchase flow beside the existing redemption flow". Probing the
running backend before writing anything returned:

```
POST /billing/lifetime -> 404 {"message":"Cannot POST /billing/lifetime"}
```

`lifetime.deal.tsx:25` has always posted there. `billing.controller.ts` never had the route — its
posts are `/check/:id`, `/check-discount`, `/apply-discount`, `/finish-trial`, `/embedded`,
`/subscribe`, `/portal`, `/cancel-subscription`, `/chatbase-refund`, `/add-subscription`. So **no
lifetime code has ever been redeemable through the UI.**

It failed silently, which is why it survived. The frontend destructures `success` from a 404 body,
gets `undefined`, and takes the else branch — `toast.show('Code already claimed or invalid code',
'warning')`. A customer with a perfectly good code is told their code is bad, and the product looks
like it is working.

**The capability was there the whole time; only the door was missing.** `StripeService.lifetimeDeal`
(`stripe.service.ts:1192`) is complete and correct — it rejects an org that already pays for a
non-lifetime plan, decrypts the code, checks it against `UsedCodes`, and stacks the org one tier up.
`UsedCodes`, `subscription.repository.ts`'s `isLifetime: !!code`, `getCode` — the whole chain exists
and nothing calls it. So E was not "build a payment system"; it was four lines of controller.

Note what this says about doc 06 §B and about my own earlier entries: both described the repo as
*having* code redemption. Both were reading the frontend and inferring the backend. The design docs
being wrong was expected; my own log repeating it was not.

**Two more things fell out of it:**

`subscription.service.ts:178` still typed `billing` as `'STANDARD' | 'TEAM' | 'PRO' | 'ULTIMATE'` —
the rename in step 7a updated the two sibling signatures at lines 64 and 113 and missed this one.
Nothing caught it because nothing passed a new tier through that parameter until now. Widened to the
full set.

The one-tier-up ladder lived **twice** — once in `stripe.service.ts` as `!current ? 'STANDARD' :
'PRO'`, once in `lifetime.deal.tsx` as the map I wrote during the rename. After the rename they
disagreed: the screen promised GROWTH and the backend would have granted PRO. It is now
`nextLifetimeTier()` in `pricing.ts`, which both import, so the tier the UI names is the tier the
backend grants. Verified across every rung:

```
FREE -> CREATOR (5)      GROWTH -> PRO (30)     AGENCY   -> AGENCY (saturated: +5 channels)
CREATOR -> GROWTH (10)   TEAM -> PRO (30)       ULTIMATE -> AGENCY (100)
STANDARD -> GROWTH (10)  PRO -> AGENCY (100)
```

The saturation branch is a generalisation of the old `=== 'PRO'` test — at the top of the ladder a
further code buys 5 channels instead of a tier. It also fixes a pre-existing bug: an ULTIMATE
subscriber redeeming a code used to land on PRO and **lose** channels. ULTIMATE and AGENCY are both
100, so nobody loses anything now.

**Verified:** `/billing/lifetime` returns `{"success":false}` for a junk code (the 404 is gone, and
the frontend's warning is now shown for the right reason) and `400 "code must be longer than or
equal to 4 characters"` for an empty one. The **success** path — a correctly encrypted, unused code
— was **not** exercised: it writes a lifetime subscription to the org, and this is the owner's real
local dev database. `lifetimeDeal` touches no Stripe API, so unlike the billing screens this one is
blocked on data, not on keys.

**The check script did not notice any of this, and that is worth saying.** `/billing/lifetime` is
line 30 of `docs/ui-migration-baseline/api.txt` — it has been in the baseline since step 0. The
collector greps the *frontend* for `fetch('/…')`, so it records which endpoints the UI calls, never
whether they answer. `api 134 unchanged` here is the correct signal — the frontend's call surface
genuinely did not move — but a "no route behind it" class of bug is invisible to it by construction.
The live probe is what caught this, and it is the fourth time this session that a check passed while
the thing itself was broken.

**Checks:** types 0 · api 134 · i18n 613 · routes 27 — unchanged. `api` staying at 134 while a
backend route was added is expected, per the paragraph above; the plan's prediction that E would move
the baseline was wrong about which side the collector reads.

---

## Steps A–D · Connections, Channels, Posts, the rail — 2026-08-02/03

Eighteen commits, `8783e0e3` → `4584de69`. Grouped by what they were, not by the order they landed.

### The rail, and the two columns beside it

The design collapses the rail and expands it on hover; a narrow window collapses it on its own. Both
behaviours are in the prototype and both are **CSS**, not JavaScript — which is why my first grep for
`mouseenter` found nothing and I reported the hover as "not in the design". It was. The rules are now
in `global.scss` under `[data-sb][data-hov='1']:hover`, ported rather than reinvented.

The same collapse/expand applies to the two other columns the design treats this way. Four routes the
design's rail shows were **not** added: they would render nothing this app does not already have a
page for. Three the design's rail does *not* show — Plugs, Affiliate, Create Post — stay, per the
non-negotiable about never deleting a capability the design happens not to draw.

### Connections — seventeen ways in, and two that do not exist

`connections.component.tsx` groups MCP, CLI, public API, webhooks, Zapier, Make, n8n and the chat
bridges into one page organised by *what you want to connect*, not by protocol. Zapier and Make ship
with a "coming soon" badge, as agreed.

Each of the seventeen was checked against its own vendor documentation. **Two shipped wrong first:**
I took the MCP commands for two clients straight from the design's `MCP_CMDS` map and they were
invented — neither client takes a command of that shape; both reach PostQueen through Agent Skills.
Removed in `ef44803d`. The design being wrong about our own integration surface is exactly the case
the handoff rule anticipates, and I had waved it through because it looked plausible.

OpenClaw and Hermes are given real depth here rather than a logo and a line, per your note that this
is what people actually reach for.

### Channels and Posts

`51b6bd81` gives channels a page. Nothing in it is new: time slots, move to a group, custom URL, copy
channel ID, disable, reconnect all already existed behind a three-dot menu on a 260px column. The
page reuses `menu.tsx` and `time.table.tsx` instead of reimplementing either.

`f2e0a4b5` adds per-provider setup guides — what a provider requires *before* you are sent to its
OAuth screen. `b1c4f1ae` adds the posts panel the design keeps beside the calendar; it is the list
view's existing `all | scheduled | draft | published` query, and it stops querying when hidden.

`4584de69` lifts publishing options out of the menu into their own row, reading `additionalSettings`
off the integration and opening the same `SettingsModal`.

### A clock the calendar was reading two ways

`b82c6cae`. The tour's demo calendar exposed it: the post **card** rendered `newDayjs(publishDate)`
while the **cell** it sat in rendered `dayjs.utc(publishDate).local()`. On any machine not on UTC the
card and its own cell disagreed. Pre-existing, not introduced by the restyle, and fixed to match the
cell.

### The guard was reporting "unchanged" for code it had never read

This is the one worth reading twice.

`f1ffcfed` added `GET /posts/count` and the api counter **did not move**. The endpoint was fine; the
collector was not. It matched a path literal only when it sat immediately after `useSWR(` or
`fetch(` — and prettier wraps any call whose arguments are long. Every wrapped call was invisible.

Measured before fixing anything:

| collector | seen | actually there | blind |
|---|---|---|---|
| api  | 135 | 148  | 13 endpoints |
| i18n | 873 | 1024 | **151 keys — 17% of the copy** |

Among the unseen api entries: `/analytics`, `/analytics/trending`, `/posts/old`,
`/third-party/function/:id/listMedia` and the OAuth reconnect paths. Among the unseen i18n keys:
most of the billing copy, every TikTok disclosure string, the whole password-reset flow.

So every green `i18n 873 · unchanged` printed in this document was silent about a sixth of the copy,
and had a restyle dropped one of those keys, the guard would have said nothing. This is the fifth
time this session a check passed while the thing it checks was broken, and the first time the broken
thing was the check.

`325fa565` fixes both: the scan now joins an opening paren to what follows, so a call means the same
thing whether or not prettier split it. Two decisions inside that:

- **Each of the 13 new api entries was verified against its call site by hand.** Reading the fixed
  collector's own output to confirm the fix would leave the fix unverified.
- **A trailing bare `${` is trimmed; a truncated one is not.** The first attempt trimmed any
  unterminated interpolation and silently rewrote four *existing* baseline entries
  (`/analytics-${integration` → `/analytics-`). Caught by diffing for removals, which is why the diff
  is run in both directions.

Known and accepted: a few SWR **cache keys** now ride along (`/billing-${tier}-${period}`). This
guard detects changes to the set of strings handed to fetch/useSWR; a cache key moving is also worth
being told about.

**The proof.** Twenty-four `prettier-ignore` directives had accumulated across six files, put there
by me to keep calls on one line so the broken collectors could see them. They are gone and the files
are formatted normally — prettier rewrapped all six, and both lists came back byte-identical. That is
the test: the collectors are now format-independent, demonstrated rather than asserted.

### Checks

`types 0 · api 148 · i18n 1027 · routes 28`.

Both baseline jumps are the guard learning to see, not behaviour moving: **api 135 → 148** and
**i18n 873 → 1024** are the collector fix, itemised above; **i18n 1024 → 1027** is three keys for the
publishing-options row. `routes 27 → 28` is the channels page.

### Still not seen with real data

The channel detail, the posts panel and the calendar have all been written and none has been viewed
with a connected channel — the same gate the composer has been behind since step 4. Counting is what
separates "empty and correct" from "broken render", and counting is all that has been done here.

### Where the work sits — five stacked draft PRs

```
main ← pr1  #5  the visual migration + the harness
     ← pr2  #6  prices, the rename, the lifetime route
     ← pr3  #7  four defects the migration uncovered
     ← pr7  #8  Connections, and the two invented MCP commands
     ← pr10 #9  Channels, the posts panel, the guard fix
```

Each stacks on the one above, so review top-down; a PR's own diff is only its own commits.
`pr4`, `pr5`, `pr6` ride inside #8; `pr8`, `pr9` ride inside #9.

### Media · the grid/list switch, and the one column it needed

The design offers Media as a grid or a list. The grid was all we had, and the list needs something
the grid never showed: a size. `getMedia`'s `select` returned id, name, originalName, path,
thumbnail, alt and thumbnailTimestamp — no `fileSize`, though the column has existed on `Media` all
along. One line added to the select; nothing else on the backend moved.

`fileSize` defaults to `0`, so rows written before the column was populated have no size. The row
shows nothing rather than "0 B" — a default is not a measurement.

Per-file **dimensions** (`PNG · 1600×1600` in the design) remain undoable and this is the second time
it is being written down: width and height are stored nowhere, and filling them in honestly would
mean reading every image on every list request.

Both layouts read one filtered list, so the type tabs cannot drift between them.

**Verified by probe, not by looking:** the List button goes from `text-pqSoft` /
`rgb(110,110,120)` to `bg-pqInner font-[600]` / `rgb(237,237,240)` with the raised shadow — the
switch changes state, at 420 and 1440, both themes, no overflow. **The rows themselves have not been
seen:** this database's media library is empty, `[data-media-row]` counts 0 at every width. That is a
correct empty render, not a verified one, and it joins the channel detail and the posts panel in the
bucket waiting on real data.

`types 0 · api 148 · routes 28` unchanged. `i18n 1027 → 1031`: grid, list, image, preview.

### The locked states need real keys after all — measured, not assumed

The plan for this step said the gates were blocked on *account state*, not on Stripe, and that
placeholder keys would be enough because "drawing a gate makes no Stripe network call". The first
half was right. The second half was wrong, and the experiment is worth recording so nobody runs it
again.

**What was right.** `users.controller.ts:99–108` never reads the tier from the database when billing
is off:

```ts
totalChannels: !isBillingEnabled() ? 10000 : …
tier: organization?.subscription?.subscriptionTier || (!isBillingEnabled() ? 'AGENCY' : 'FREE')
```

`isBillingEnabled()` is *both Stripe keys being non-empty* (`billing.enabled.ts:17`), and neither is
set here. So every account on this install reports AGENCY with 10000 channels — **seeding a FREE user
would have changed nothing.** Good thing to have measured before writing the seed script.

Starting the API and the frontend with two placeholder values flipped it immediately:

```
before   tier: AGENCY  totalChannels: 10000  isTrailing: false
after    tier: FREE    totalChannels: 0      isTrailing: true
```

`isTrailing: true` is real data — this organization is mid-trial in the database and the flag was
being suppressed, not absent.

**What was wrong.** The app never finished loading. The backend log:

```
StripeAuthenticationError: Invalid API Key provided: sk_test_****************tion   (×10)
```

The shell's billing lookup (`GET /billing/`) calls Stripe during page load. A key Stripe will not
authenticate 401s there, the request never resolves, and every screen sits on its loading skeleton
forever. So the locked states cannot be photographed with a fake key — they need keys Stripe accepts,
which is exactly the test keys the owner is providing.

**Conclusion:** the gate work moves to the same bucket as the rest of billing — written now,
verified when the keys arrive. Nothing was left switched on: the placeholders were passed on the
process command line rather than written to `.env`, so restoring meant restarting the two servers,
and `/user/self` reports `AGENCY / 10000 / isTrailing false` again.

**Two things I broke and fixed on the way, recorded because they cost more than the experiment did.**

Running `nest start` from the repository root instead of `apps/backend` picks up the wrong tsconfig:
5950 errors, and it wrote **1484 compiled `.js`/`.js.map` files into the source tree** before failing.
One of them was `apps/frontend/src/proxy.js`, sitting beside `proxy.ts` — Next.js reported
*"Duplicate page detected"* and served the stale copy, which is why every screenshot redirected to
`/auth` for a while and sent me looking at cookies. `git clean` on `*.js`/`*.js.map` removed all 1484;
the tree is clean and every one of them was mine, not the repo's.

I also edited `ui-shot.mjs` to scope cookies by URL instead of by domain, on a theory about
`localhost` cookies. It did not fix the redirect — the stale `proxy.js` had — so it is reverted. An
unproven change to the tool that verifies everything else is worse than no change.

### The X trial lock — built on both sides, and honest about what was tested

The design locks X while an organization is trialing: three perks, *"End free trial to unlock X"*,
and a dated line *"X unlocks on 7 Aug 2026"*. **The repo had no such rule.** Its only real trial gate
is `media.service.ts:86` — `!video.trial && org.isTrailing` — for video generators. So this was the
design implying behaviour, it was raised, and the owner chose to make it real, backend included.

**Generic, per CLAUDE.md.** `trialLocked` is a field on the provider
(`social.integrations.interface.ts`), `true` on `x.provider.ts`, and
`IntegrationService.assertConnectAllowed()` reads it. A second locked provider is one field on that
provider and no change anywhere else — the same reasoning that put `category` there. Nothing in
generic code names X.

**Both doors, because they are different doors.** `GET /integrations/social/:integration` turns a
locked provider away before the consent screen, so the reason is visible early;
`POST /integrations/social-connect/:integration` checks again because it is the one that actually
creates the channel, and a state issued before the trial began must not still buy a connection.

**Three deliberate escapes:** billing off (self-hosted, every gate open); an organization that is not
trialing; and `refresh`, which is an existing channel reconnecting. A connected X channel is never
cut off — the lock stops *new* connections only. Silencing a channel someone already publishes
through would punish the wrong person.

**The dated line is not built.** `Organization` has `isTrailing` and `allowTrial`, both booleans, and
**no trial end date** — the date in the design comes from a Stripe subscription's `trial_end`. The
copy says the same thing without naming a day it cannot know: *"Or wait — X unlocks by itself when
your free trial ends."*

**What was actually verified, and what was not.**

- ✅ Billing off: `GET /integrations/social/x` returns the pre-existing `{"err":true}` (X credentials
  are not configured here) — **not** the lock message. The gate correctly stays out of the way.
- ✅ Types clean on both apps.
- ❌ **The locked path itself is unexercised.** With billing on, this organization is FREE with a
  zero channel allowance, so the pre-existing `@CheckPolicies([Create, CHANNEL])` guard answers
  `402 "You have reached the maximum number of channels"` for **every** provider before the handler
  runs. The lock only becomes reachable for an organization that has channel allowance *and* is
  trialing — a paid plan mid-trial, which needs a real Stripe subscription.

That last point is worth keeping: the design's scenario is a *paid* trial, and the state this install
can reach is a *free* one. The rule is written and typed; it has not yet refused anything.

`types 0 · api 148 · routes 28` unchanged. `i18n 1031 → 1036`: the three perks, the CTA and the
undated footnote.

### The tour ended in the wrong place, and the caret was never drawn

Reading the prototype's `tourSteps()` beside ours: both have six steps, but the order differs and the
ending differs.

```
design   calendar → calendar+panel → aiagents(nav) → aiagents → calendar(nav) → channels + connect
ours     calendar → panel → channels → add-channel → connections → mcp clients
```

The design finishes on the **connect dialog** — where the person is meant to do something. Ours
finished on a list of MCP clients to read. The two Connections steps now come before the channel
ones, and the last step is on `/channels`.

That last step could not exist until now, twice over: the page did not exist, and once it did it had
**no connect button of its own** — its empty state sent you to `/launches` to find one. The design
keeps a connect affordance on the channels page (`chAddDisplay`), so it has one now: the same
`useAddProvider` hook the calendar column uses, in the list header and in the empty state. No new
dialog, no second code path.

The **caret** — the pointed tab the design draws from the card back to its target — was missing.
`setupVals()` draws it only when the card ended up to the *right* of the target
(`bl > r.l + r.w`), which is the one placement where the gap between card and target reads as
ambiguous. Same condition here, same vertical clamp.

**Verified by counting and probing, not by looking:**

```
step 1  (card sits inside the calendar grid)   [data-tour-caret] → 0
step 5  (channels column, card to the side)    rect 501,467,23,23 · bg rgb(27,27,32)
step 6  (/channels)                            [data-tour-caret] → 1
```

and the last step reached at 420 and 1440 in both themes, no overflow. `types 0 · api 148 ·
i18n 1036 · routes 28` — all unchanged, which is right: the steps were reordered, not rewritten, and
the copy keys moved with them.

### The gate inventory, and the sweep that had never seen half the app

**`collect_gates`.** Doc 03 lists about fifteen feature gates. They were walked by hand once, in
step 8, and nothing has protected them since: a restyle that dropped `tier?.autoPost` would hand
every account a paid tab, and `api`, `i18n` and `routes` would all still read *unchanged*, because
none of them can see a condition. Twelve entries now, **counted**:

```
allowTrial 6      tier.ai 4              tier.public_api 3    trialLocked 5
billingEnabled 27 tier.autoPost 2        tier.team_members 3  user.isLifetime 6
isTrailing 5      tier.current 17        tier.webhooks 3
tier.image_generator 2
```

Counted rather than merely named, because a gate falling from two call sites to one is the
half-removal this exists to catch and a set alone would miss it. `tier?.x` and `tier.x` collapse to
one entry — optional chaining coming or going is not a gate change.

**Shown to work, not asserted.** One gate was deliberately deleted —
`user?.tier?.ai` on the Generate Posts button, `launches.component.tsx:600` — and the check went red
with `tier.ai 4 → 3`. Restored, green again. After last week, a guard that has not been seen
catching something is not a guard.

**`scripts/ui-sweep.sh`.** The sweep lived in a scratch directory and covered seven screens. It never
included `channels` — a page added *during* this migration — nor either billing screen, so every
"zero horizontal overflow" it printed was a claim about half the app. It is in the repo now, covers
ten signed-in screens plus three auth screens (which need the *opposite* of a session, since the
middleware bounces a signed-in visitor away from `/auth`), and names the four it skips —
`/p/[id]`, `/oauth/authorize`, `/admin/stats`, `/admin/errors` — so the gap is visible beside the
coverage instead of being invisible.

### What it found on its first run: opening Billing logs you out — and the fix

Not an overflow. `/billing` and `/billing/lifetime` both ended on `/auth`.

**My first reading of this was wrong and is corrected here.** I wrote that the ADMIN policy on
`/user/subscription/tiers` was refusing. It is not: `permissions.service.ts:130` grants `Sections.ADMIN`
to roles `ADMIN` and `SUPERADMIN`, and this account is one. The 401 came from further in, and the
backend log named it:

```
StripeAuthenticationError: Invalid API Key provided: sk_nothing
```

`stripe.service.ts:19` constructs the SDK with `process.env.STRIPE_SECRET_KEY || 'sk_nothing'`, so on
an install with no key **every** Stripe call answers 401. `getPackages()` makes one. And
`layout.context.tsx:83` treats any 401 as an expired session: it clears `auth`, `showorg` and
`impersonate` and sends the browser to `/`, which the middleware bounces to `/auth`.

So on a self-hosted install — billing off, Billing hidden from the navigation but still reachable by
URL — **visiting `/billing` signed the user out.** Both halves predate this branch
(`74d66569` and the Stripe placeholder), and the restyle could never have caught it, because the
screen was not in the sweep.

**Fixed at the honest end.** `getPackages()` returns `{}` when `isBillingEnabled()` is false. There
are no packages to list when nobody can buy one, so it says so instead of asking Stripe a question it
cannot answer. Not touched: the 401-means-logout rule, which is correct when a session really has
expired — the bug was a feature endpoint reporting a *Stripe* authentication failure as if it were
the user's.

**Verified:**

```
before   GET /user/subscription/tiers → 401   → /billing lands on /auth
after    GET /user/subscription/tiers → 200 {} → /billing renders
```

`/billing/lifetime` now reaches `/billing` rather than `/auth` — the app's own redirect, not a
session loss.

### Billing: the screen opened, and looking at it found four defects

The fix in `79669cef` made `/billing` reachable, and reaching it changed the plan. The plan cards do
not come from Stripe: `main.billing.component.tsx:471` and `first.billing.component.tsx:138` both
iterate `Object.entries(pricing)`. Prices, features, the monthly/yearly switch and the FAQ have been
renderable all along. Only *subscription state* needs a key.

Then the screen itself, read rather than assumed:

**1 · The cards were in the wrong order — CREATOR, GROWTH, AGENCY ($99), PRO ($49).**
`Object.entries` follows file order, and `PRO` sat below the "retired" divider in `pricing.ts`,
between STANDARD/TEAM and ULTIMATE, without being retired itself. The grid filters on `!retired`, so
PRO fell to the end. Both the billing grid and the paywall walk the same object, so the entry moved
rather than one screen sorting itself. Verified by geometry, not by looking:

```
CREATOR 256 → GROWTH 551 → PRO 846 → AGENCY 1141      ($20 → $33 → $49 → $99)
```

**2 · Every card listed the same feature twice.** `Features` pushed `AI auto-complete`,
`AI copilots` and then `AI Autocomplete` — the first and third are one feature spelled two ways.
Counted per card, before → after: CREATOR 7→6, GROWTH 9→8, PRO 9→8, AGENCY 9→8. Exactly one gone
from each, which is what one duplicate removal should look like.

**3 · `fill="#06ff00"`** in `main.billing.component.tsx` and twice more in `lifetime.deal.tsx` — a
raw hex in a component, and a green belonging to no palette. Now `currentColor` under `text-pqOk`:
`rgb(22,163,74)` light, `rgb(74,222,128)` dark, measured at all three widths.

**4 · The whole feature list was hardcoded English.** Not one `t()` in `Features`, on a screen every
paying customer sees, in an app with fourteen languages. Eleven keys now, plurals kept where the code
already made the distinction.

**A fifth, found while clearing the hex:** `faq.component.tsx` drew its **plus** icon with
`fill="white"` — invisible against the light theme. The `text-white` audit in step 8 walked 95
occurrences of the *class* and could not see a `fill` attribute. Fixed the same way. That is twice
now that an audit's shape decided what it could find.

**AGENCY is unlimited**, decided by the owner today. `AGENCY.channel` takes the very-large-number
idiom `posts_per_month` already uses, so the existing `> 10000 → 'Unlimited'` branch renders it with
no tier named in the display code. Worth restating plainly: a channel is recurring API load, not a
label, so this is a real product commitment and not a copy change.

**Left literal on purpose:** the five hex values in `embedded.billing.tsx`. Stripe's Elements run in
a cross-origin iframe — its appearance API takes literal colours and cannot resolve a CSS variable
from this document — and the other two are the Stripe wordmark and the Link glyph. Brand marks are
the one place a fixed colour is the right one. Commented in the file so it does not read as an
oversight.

**Checks:** `types 0 · api 148 · routes 28 · gates 12` unchanged — `gates` mattering most here, since
this touched the screen where every tier condition lives and moved none of them. `i18n 1036 → 1047`,
the eleven plan strings. Sweep: thirteen screens, both themes, zero overflow.

**Still on keys:** the subscription states (`trial` with its date, `active` and its Current-plan
marker, `discount`, `canceling`, `payment_failed`, `ended`, `lifetime_trial`), the checkout paywall's
Due-today and lapsed modes — which is where `riseIn` and `dropIn` live — the lifetime purchase
(`mode: 'payment'` plus its webhook branch, no counter and no countdown), and Settings' Plan &
invoices.

### Does the tour actually work? A table, not an opinion

The honest answer needed measuring every step, not clicking through once. `data-tour-ring` makes the
spotlight countable; the matrix is six steps × two widths × the posts-panel preference both ways.

**Before:**

```
step               panel open    panel collapsed
                   420 1440      420 1440
cal-grid            1   1         1   1
posts-panel         1   1         0   0     ← the defect
connect-pq          1   1         1   1
mcp-clients         1   1         1   1
channels-column     1   1         1   1
channel-connect     1   1         1   1
```

Collapsing the posts panel is a preference that lives in a cookie for **a year**
(`calendar.context.tsx:164`), and `posts.panel.tsx` returns early when it is collapsed — the
`data-tour` anchor only exists in the open branch. So anyone who ever collapsed that panel got a step
titled *"Every post in one queue"* pointing at nothing, permanently. The card still appeared, centred,
with the full scrim: it never looked broken, which is why only counting found it.

**The fix is the prototype's, without the side effect.** The design's step carries
`panelCollapsed: false`. Here the step declares `needs: 'posts-panel'`, the panel asks
`useTourNeeds('posts-panel')` and renders open while that step is on screen. **The cookie is never
written** — so there is no preference to restore, and no way to leave someone's panel changed after
the tour. Verified: with the tour off and the cookie collapsed, the anchor count is back to 0.

After the fix every cell is 1. Step metadata and step copy are now separate (`STEPS` beside
`useSteps()`), because a selector outside the component needs to ask what step N requires without
dragging translations along.

**Mobile was a false alarm.** I expected phone widths to lose targets to drawers. They do not: 420
finds a target for all six. Written down so it is not re-investigated.

### Connections had no way in — and the entry I added first pointed at the wrong tab

The design keeps Connections in the rail. Here the page — seventeen documented integrations — was
reachable only by opening Settings and happening to find the tab. The menu already has the pattern:
Sets, Signatures, Auto Post and Webhooks are all entries whose `path` is a Settings tab
(`top.menu.tsx:140–160`). Connections is one now.

**My first version pointed at `/settings?tab=api` and I nearly shipped it.** That is the older Public
API tab; the Connections page is `tab === 'connections'` (`layout/settings.component.tsx:255`).
Counting is what caught it:

```
/settings?tab=api          [data-connector] → 0
/settings?tab=connections  [data-connector] → 17
```

A screenshot of `tab=api` shows a settings page with content on it. It looks fine. It is the wrong
page.

Worth noting for later: the tour's `connect-pq` and `mcp-clients` steps also point at
`/settings?tab=api`, and their anchors genuinely live there (`public.component.tsx`), so those steps
work. But the design's equivalent steps are about the Connections page. Whether to move them is a
content decision, not a defect, and it is written down rather than done quietly.

**Checks:** `types 0 · api 148 · i18n 1047 · routes 28 · gates 12` — every one unchanged. No new
route (a tab is not a route), and `connections` was already a translation key.

### The keys arrived, and the screen nobody could see turned out to work

The owner put real Stripe **test** keys in `.env`. Restarted both servers and measured rather than
assumed:

```
/user/self                  tier FREE · totalChannels 0 · isTrailing true   (gates live)
/user/subscription/tiers    200 {}                                          (no 401, no logout)
StripeAuthenticationError   0 in the whole boot log
```

`{}` from tiers is correct, not a failure: `getPackages()` looks up `standard_monthly`,
`standard_yearly`, `pro_monthly`, `pro_yearly`, and a fresh test account has no such prices. The
point is it **authenticated** — the 401 that used to sign people out is gone for the right reason
now, not just because the call was skipped.

**The checkout paywall renders end to end.** Real Stripe Elements mount (card, expiry, CVC, the
Stripe badge), the trial line computes a genuine date — *"Your 7-day trial is 100% free ending
August 11, 2026"* — and the plan cards come out **Creator $20 · Growth $33 · Pro $49 · Agency $99**,
so the `pricing.ts` reorder holds on this screen too. This is doc 03's `not_started` state, and it
has been unreachable for the entire migration.

**Two things it showed that nothing else could.**

**1 · The duplicate feature was in two places, not one.** I removed `AI Autocomplete` from
`main.billing.component.tsx` and thought that was it. `first.billing.component.tsx` has its **own**
`BillingFeatures` list with the same pair — `billing_ai_auto_complete` and `billing_ai_autocomplete`,
one line apart — and it is the checkout screen, so every prospective customer read it twice. Removed.
The translation key stays in the catalogues, unused; deleting keys is not this migration's business.

**2 · The paywall overflows horizontally at 420** — `+9px` light, `+7px` dark. **This is the first
horizontal overflow this migration has found**, after dozens of clean sweeps, and it is on the screen
a new customer sees before anything else. It could not have been caught earlier: the page only exists
for a FREE tier, which needed billing switched on, which needed these keys. Not fixed in this pass —
recorded with its measurements so the fix starts from a number rather than a guess.

**Checks:** `types 0 · api 148 · i18n 1047 · routes 28 · gates 12`, all unchanged.

### The lifetime window — and the page the offer's audience could not reach

The owner supplied the rule that was missing: the founding-member offer is open for **24 hours from
registration**. That changes an earlier decision and it should be said plainly — a lifetime countdown
was declined during step E on the grounds that it counted down to nothing. That objection was about a
*fabricated* deadline. This one is derived from `User.createdAt`, so it is a fact, and it is built.

`lifetimeWindow()` lives in `pricing.ts` beside `nextLifetimeTier()`, because the screen that draws
the clock and the route that takes the money have to agree about when the offer closed. A clock the
frontend owns alone is a clock the backend eventually disagrees with. Bad or missing `createdAt`
reads as **closed** — that withholds an offer rather than granting one on bad data.

`POST /billing/lifetime` refuses with `410 Gone` once the window shuts. Same reasoning as the trial
lock: a countdown the server does not enforce is decoration.

**Then the page turned out to be unreachable by the people the offer is for.**
`new-layout/layout.component.tsx:279` replaces the *entire shell* with the checkout paywall whenever
`tier === 'FREE' && isGeneral && billingEnabled` — every route, including `/billing/lifetime`. So the
founding-member page was visible only to accounts that had already subscribed, which is precisely the
wrong half of the audience. That route is now exempt, and only that route.

**Verified from real data:** the page renders for this FREE account and the countdown reads *"The
founding-member offer closed 24 hours after you signed up"* — correct, since it registered on
17 July, eighteen days ago. The **open** branch has not been seen: it needs an account less than a
day old, and inventing one to photograph would be inventing the evidence too.

`types 0 · api 148 · routes 28 · gates 12` unchanged; `i18n 1047 → 1049`.

### The lifetime purchase — the map, before the change

Traced rather than guessed, so the next pass starts from facts:

- **Checkout is created** in `stripe.service.ts`, `mode: 'subscription'` at lines 539 and 610. A
  lifetime purchase is a one-off, so it needs `mode: 'payment'` — a different session shape, not a
  flag on the existing one.
- **The webhook lands** at `stripe.controller.ts:21` and switches on `event.type` at :41. The
  branches are `invoice.payment_succeeded`, `customer.subscription.{created,updated,deleted}`.
  **A `mode: 'payment'` session emits none of these** — it emits `checkout.session.completed`, and
  there is no case for it. Without one the money arrives and nothing is granted.
- **The ownership guard** at :33 drops any event whose `data.object.metadata.service` is not
  `SUBSCRIPTION_SERVICE_TAG`. A lifetime session has to carry that tag or its own webhook is
  discarded by the app that created it.
- **What to grant** already exists: `subscription.repository.ts` writes `isLifetime: !!code` and
  `StripeService.lifetimeDeal` runs the ladder through `nextLifetimeTier()`. The purchase branch
  should reuse that path, not open a second way to become a lifetime member.

So the change is four connected pieces: a payment-mode session carrying the service tag, a
`checkout.session.completed` case, a grant that reuses `lifetimeDeal`'s effect, and the button.

**Not started, deliberately.** It is the one path in this migration where stopping half-way is worse
than not starting: a session that takes money with no branch to grant the entitlement charges someone
and gives them nothing. It needs to be written and verified in one piece.

### The lifetime purchase stops here, on a question only the owner can answer

Two of the four pieces are in (`7c561e5e`): the grant and the webhook branch. The third — the
`mode: 'payment'` checkout session — needs one thing that does not exist anywhere in this repository:

**What does a lifetime deal cost?**

`pricing.ts` has no lifetime price. `stripe.service.ts` has none. The design shows `$49`, but that is
`ltPaid: 49` in the prototype's demo state (`…dc.html:4618`), sitting beside `ltPaid: 0` for the
trial variant — it is stage dressing reusing the PRO monthly figure, not a price list. Doc 03's
pricing table has four monthly and four yearly numbers and no lifetime row.

A checkout session has to name an amount. Inventing one would mean this migration set a price, which
is the one thing it has refused to do everywhere else — and unlike a label, a wrong number here takes
the wrong amount of money from a real person.

**Recorded rather than guessed, and this is the question:** what is the lifetime price, and is it one
price or one per tier? The ladder grants CREATOR → GROWTH → PRO → AGENCY depending on what the
account already has, so "one payment" could reasonably mean one figure or four.

Everything else for lifetime is ready and waiting on that number: the grant, the webhook, the
24-hour window with its server-side `410`, the founding-member surface, and the page being reachable
by a FREE account.

### Granting lifetime, and eight screens seen for the first time

The paywall replaces the whole shell for a FREE tier, so eight of the ten
signed-in screens had never been photographed — 48 of 78 shots were one screen
over and over. `scripts/grant-lifetime.mjs` writes the same subscription row
`grantLifetimeFromPayment` writes, so this is not a third way to become a
lifetime member; `--revoke` puts it back, and it refuses to touch a row it did
not write.

**It failed on the first real run, informatively:**

```
invalid input value for enum "SubscriptionTier": "CREATOR"
```

The ladder gives FREE → CREATOR, and this database's enum does not have CREATOR
— `prisma db push` has never run here. That is the prerequisite `migrate-tiers.mjs`
documents at the top, now demonstrated rather than described. Rather than push a
schema change to the owner's dev database as a side effect of wanting a
screenshot, the script gained `--tier`, and PRO — a value the enum has always
had — was used instead.

**What that immediately bought:**

- The **founding-member block** rendered for the first time. It was written
  three commits ago and had never been seen: badge, thanks line, and three
  facts (4 elements counted). It picked the trial variant, correct for an
  account that is lifetime *and* trialing.
- The sweep reports **zero paywall shots** — thirteen screens, three widths,
  both themes, all rendering their own content, **no overflow anywhere**.
- `/billing` redirects to `/launches`, which is doc 03's fourth lifetime rule
  (`main.billing.component.tsx:448`) working. It has been in the code the whole
  migration and this is the first time anything confirmed it.

The remaining `⚠` lines are the app's own redirects: `/agents → /agents/new`
and the lifetime billing redirect above.

### The lifetime purchase, finished

`LIFETIME_PRICE = 49` — one figure for everybody, the owner's call. It lives in
`pricing.ts` beside everything else about what a plan costs, so the screen that
shows the price and the session that charges it read the same constant. The
*tier* still comes from the ladder, so the same $49 is worth more to an account
that already pays; that is the ladder's existing behaviour and predates the
price.

`createLifetimeCheckout` is `mode: 'payment'`, and two consequences of that are
load-bearing rather than incidental:

- The metadata goes on the **session**, not `subscription_data`, because there
  is no subscription to hang it from — and `stripe.controller.ts:33` drops any
  event whose `metadata.service` is not ours, so without the tag the app would
  discard its own webhook.
- It emits `checkout.session.completed`, which is why that branch was written
  three commits *before* this method. At no point could a session exist that
  took money with nothing to answer it.

`price_data` rather than a stored Stripe price: a price object created by hand
in a dashboard is one more place for the number to drift from `pricing.ts`.

**Verified end to end on the closed-window case**, which is the state this
account is actually in:

```
POST /billing/lifetime-checkout  → 410  "The founding-member offer has closed."
POST /billing/lifetime           → 410  same
```

Both doors, one rule. The button is only rendered inside the open branch of the
countdown, but that is a UI decision — the refusal above is the rule, and it
does not depend on the screen.

**Not exercised:** the open window and a real payment. That needs an account
younger than a day and a card, and a test purchase against the owner's Stripe
account is theirs to make, not mine.

### doc 03's four lifetime rules, verified at last

They have been in the code since before this migration and step 8 checked them
by *reading*. With a lifetime account they can be counted:

| rule | where | measured |
|---|---|---|
| Rail's Upgrade row hidden | `rail.tsx:133` | `a[href="/billing"]` → **0** |
| Billing filtered from the menu | `top.menu.tsx:290` | same count, same 0 |
| `{Tier} tier` on the channels column | `launches.component.tsx:641` | `"Pro tier"`, count **1** |
| Billing redirects a lifetime user away | `main.billing.component.tsx:448` | sweep: `/billing → /launches` |

The first two share a measurement because they share a symptom: with both
applied there is no link to `/billing` anywhere in the chrome. If either had
lapsed the count would be 1, and step 8's reading could not have told the
difference between "both correct" and "one correct, one dead".

The tier label gained `data-lifetime-tier` so it could be counted at all — the
same reason the tour's ring and the plan cards gained theirs. A rule with no
handle is a rule that gets verified by squinting.

### "End free trial" never ended anything for a founding member

The owner's rule: someone who ends their trial from the X lock or AI Copilot
becomes a lifetime member immediately. Traced, it did the opposite — silently.

`finishTrial` listed the customer's Stripe subscriptions, filtered to
`trialing`, and indexed `list[0].id`. **A founding member has no Stripe
subscription at all** — a lifetime entitlement is a local row — so that threw.
The controller wrapped it in `try {} catch {}` and returned `{finish: true}`
regardless. The dialog then polled `/billing/is-trial-finished`, which answers
`!org.isTrailing`, and nothing had cleared that flag. So:

```
finish-trial      → {"finish": true}     (a lie, politely)
is-trial-finished → {"finished": false}  (forever)
```

`finish.trial.tsx` retries every two seconds. The dialog never closed.

**Fixed at both ends.** `finishTrial` now returns `{ ended }` — `false` means
Stripe had nothing to end, which is information the caller needs, not a
failure. A real API error still throws, because "the call failed" and "there was
no trial" must not look the same to whoever is about to clear somebody's trial
flag. The controller clears it locally on `ended: false` only, through a new
`OrganizationService.endTrial` (DTO → Controller → Service → Repository, as the
project requires).

**Verified on the account that was actually broken:**

```
before  PRO · isLifetime true · isTrailing true
POST /billing/finish-trial      → {"finish": true}
GET  /billing/is-trial-finished → {"finished": true}   ← was false forever
after   PRO · isLifetime TRUE  · isTrailing false
```

Lifetime survives, which was the other half of the question: a paid entitlement
must not be lost by ending a trial.

Note for whoever reads the screenshots next: this account is no longer trialing,
so the founding-member block now shows its *paid* copy ("One payment, done")
rather than the trial copy. Both variants have been seen.

### Step 5 begins: the chrome, measured against `chromeVals()`

The design comparison can finally run against real screens. Starting with the
chrome, because it is on every one of them.

`chromeVals()` at `…dc.html:5274` gives the rail three widths:

```
v.mobile ? '264px' : (s.railCollapsed ? '60px' : '236px')
```

Measured here, by probing `[data-sb]` rather than by looking:

| state | design | measured |
|---|---|---|
| expanded, 1440 | 236px | **236px** |
| collapsed (`railCollapsed=1`) | 60px | **60px** |
| phone drawer, 420 | 264px | **264px** (at y=56, under the header) |

Three for three. This is the part of the migration that was done earliest and it
has held.

Still to compare in this step: header and user menu (`chromeVals`), Settings
(`settingsVals`), the calendar toolbar and grids (`calendarVals`/`gridVals`),
the non-calendar pages (`pagesVals`), and every overlay (`overlayVals`) — with
the owner's list in mind: lines, panels, centring, scrolling, both themes,
profile and settings.

### Step 5, continued: the header

`…dc.html:181` and `:185` give the header `height:56px`. Probed here at 1440 in
both themes:

```
dark   rect 0,0,1440,56   bg rgb(11, 11, 13)
light  rect 0,0,1440,56   bg rgb(248, 248, 250)
```

56px in both, full width, and the background follows the theme rather than
being fixed — which is the thing the `.dark`/`.light` body-class approach exists
to get right, since there are no `dark:` utilities anywhere in this app.

The logo cell beside it is `w-[236px]` with `border-e border-pqRailLine`
(`layout.component.tsx:74`), so the vertical hairline under the logo lines up
with the rail's edge rather than floating near it. That is the alignment the
owner asked to be careful about, and it is structural here rather than a
coincidence of two numbers that happen to match: both read the same 236.

**Still to compare:** the user menu, Settings (`settingsVals`), the calendar
toolbar and grids, the non-calendar pages, and the overlays.

### Step 5, continued: Settings — one tab genuinely missing

`settingsVals()` names: Global Settings, Language, Team Members, **Plan &
invoices**, Integrations, Autopost, Signatures, Developers, Approved Apps.

Ours: `global_settings`, `language`, `teams`, `autopost`, `signatures`, `api`
(Developers), `approved_apps` — plus `sets`, `webhooks` and `connections`, which
the design does not name and which stay, per the rule about never deleting a
capability the design happens not to draw.

**The gap is one tab: Plan & invoices.**

Traced what could back it, because the obvious candidate cannot:

- `GET /billing/charges` **is superadmin-only** (`billing.controller.ts:189`).
  It is the impersonation tool's charge list, not a customer-facing invoice
  feed. Wiring a settings tab to it would 400 for every ordinary user.
- The realistic source is `GET /billing/portal`, which exists and is what Stripe
  expects to be used for invoice history.
- **For a founding member neither applies.** There is no Stripe subscription, so
  no portal session and no invoices — the tab would show the plan and say there
  is nothing to renew, which is also what the design's lifetime copy says.

That is the shape, not the build: it needs a route, a tab, and two states (paid
vs lifetime). Recorded rather than started, because half a billing tab that 400s
for ordinary users is worse than a missing one.

### Step 5, continued: the calendar's view set

`gridVals()` builds from `['day', 'week', 'month']` (`…dc.html:7005`) with
`List` alongside (`:4196`). `filters.tsx` offers `day`, `week`, `month`, `list`
— the same four, and the toolbar renders a date range and a Today control
beside them.

Worth being precise about what that does and does not establish: the *set* of
views matches, and the toolbar has the same controls. It says nothing yet about
how each grid draws — hour rows, the 1px cell lines, where a post card sits
inside its cell. Those are the next thing to compare, and they need a populated
calendar, which is still waiting on a connected channel.

**Step 5 so far**

| surface | design | measured |
|---|---|---|
| rail, expanded / collapsed / phone | 236 / 60 / 264 | same three |
| header | 56px | 56px, both themes |
| logo cell hairline | on the rail edge | shares the same 236 |
| settings tabs | nine named | eight present, **Plan & invoices missing** |
| calendar views | day / week / month / list | same four |

One gap found so far, and it is the one already known to be waiting on billing.

### Step 5, continued: the pages and every overlay

**Pages.** `/analytics`, `/media`, `/plugs`, `/third-party`, `/settings` all
render their own heading — Analytics, Media, Plugs, Integrations, Settings —
with no overflow at 1440. These are the screens that were behind the paywall
until the lifetime grant; this is the first time any of them has been looked at
since billing was switched on.

**Overlays.** `overlayVals()` enumerates twenty:

```
rename · alttext · feedback · support · extension · member · webhook · autopost
set · signature · apikey · upload · library · design · oauthapp · wizard
botpicture · customer · timetable · customurl
```

**All twenty exist here.** Four came back missing on the first pass —
`apikey`, `design`, `botpicture`, `customurl` — and all four were my grep
patterns being too narrow, not absences: they are `ApiKeyDto`/reveal,
`Polonto`/`designMedia`, `BotPicture`/`canChangeProfilePicture`, and the custom
URL entry on the channel menu. Worth writing down that the first answer was
wrong, because "four overlays missing" would have been four pieces of work
invented out of a bad search.

**Step 5 status**

| surface | result |
|---|---|
| rail, three states | matches (236 / 60 / 264) |
| header | matches (56px, both themes) |
| settings tabs | one gap: **Plan & invoices** |
| calendar views | matches (day / week / month / list) |
| non-calendar pages | all render, headings match, no overflow |
| overlays | all twenty present |

Still ahead: how each grid *draws* (hour rows, cell hairlines, card placement),
which needs a populated calendar, and the light-theme pass over the pages now
that they are reachable.

### A class of light-theme bug the earlier audit could not see

Step 8 audited `text-white` — 95 occurrences, six genuinely broken. That audit
walked a *class name*. It could not see a `fill` attribute, which is how the
FAQ's plus icon stayed invisible on the light theme until it turned up by
accident while clearing hex literals.

Searched properly this time: **42 hardcoded `fill="white"` / `stroke="white"` /
`#fff`** across the frontend, in `ui/icons/index.tsx` (a shared icon set),
`signature.tsx`, `information.component.tsx`, `generator.tsx` and others.

**Not 42 bugs, and not bulk-replaceable.** White is correct for an icon sitting
on a brand-coloured or dark ground, which many of these are — the `text-white`
audit found the same ratio, 6 broken out of 95. Deciding needs each call site's
background, and `ui/icons/index.tsx` is the awkward one: it hardcodes the colour
inside the icon, so a caller cannot recolour it for a theme even if it wanted to.

Attempted to verify one live (`signature.tsx`'s icon on the Signatures tab) and
it does not render without a saved signature, so it could not be caught either
way. That is the honest state: **the class is identified and counted, the
individual verdicts are not made.**

Doing it properly means auditing 42 call sites for their background and moving
the genuinely-wrong ones to `currentColor` under a token, exactly as the three
billing ones were. That is a session's work on its own and it is written down
rather than half-done — a bulk replace here would turn white icons invisible on
dark grounds, which is the same bug in the other direction.

### The white-fill audit cannot be automated, and the attempt is worth recording

Tried to sort the 42 hardcoded white fills by looking for a coloured background
class within fourteen lines of each. It returned **41 suspicious, 1 safe**,
which is obviously wrong: five of the files are provider *previews*
(`linkedin.preview`, `facebook.preview`, `tiktok.preview`) where the white is
part of a brand logo and correct by definition.

The heuristic fails because a coloured ground is often not a class near the
`fill` — it can be an inline style, a parent several components up, or an image
behind the icon. A search that cannot see the ground cannot judge the figure.

So the position stands: **42 found, counted, and located; verdicts require
looking at each site.** The largest cluster is `ui/icons/index.tsx` with 14,
and that file is the one worth fixing regardless of verdict — it hardcodes the
colour inside each icon, so no caller can theme one even when it should.

Recording the failed attempt because the alternative was to publish 41 findings
that a first glance would have refuted, and this migration has already been
caught once by a search whose shape decided its answer.

### One of the four suspects cleared, by looking at it

The 42 white fills live in only four icon components inside
`ui/icons/index.tsx`: `SettingsIcon`, `DeleteCircleIcon`, `DragHandleIcon`,
`NoMediaIcon`. That is a far smaller problem than fourteen scattered sites.

`NoMediaIcon` was the strongest suspect — an empty-state illustration, white
fill, transparent ground, and the light theme behind it. Exactly the shape of
the FAQ plus-icon bug.

**It is correct.** Screenshotted at 1440 in the light theme: the illustration
draws as lilac rounded squares with white picture glyphs *inside* them. White on
purple. Had I trusted the heuristic and "fixed" it, I would have made a working
illustration invisible against its own background.

The other three are all on media tiles or in a modal, where a white glyph over a
photograph is the usual and correct choice — but they have not been looked at,
and after this they will be looked at rather than reasoned about.

Also confirmed incidentally, since the screenshot shows the whole page: the
light theme of the Media screen — rail, nav, tabs, the Grid/List switch, the
Upload button — reads correctly. This is the first time that page has been seen
in the light theme since billing was switched on.
