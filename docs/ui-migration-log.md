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
| 5 · Channels + inline connect | Add Channel restyled, photographed and **grouped** (34 tiles, counted). Modal→inline was declined until `/channels` existed (PR #9); **superseded** — Channels page now hosts the inline Add pane (see fidelity gap pass) |
| 6 · Settings, Analytics, Media, Plugs, Integrations | done for everything this install renders |
| 7 · Billing, paywall, checkout | **not done.** `/billing` does not render here at all — see below |
| 8 · Feature-gating audit | done — no gate has drifted |
| 9 · Onboarding + tour | **tour-only first-run** — design spotlight tour (`Tour`); dead fullscreen `OnboardingModal` removed |
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

**E. The design's modal → inline connect pane** was declined while there was no Channels page.
**Superseded (2026-08-05):** `/channels` landed in PR #9; the Channels page now opens Add Channel
inline (same `AddProviderComponent` as the modal). Calendar no longer hosts a channel column.

**F. Create Post header vs calendar toolbar (2026-08-05).** Design header has no Create Post;
`chromeVals` handlers are dead. Blank/AI split now sits on the calendar toolbar so the
capability stays reachable. Confirm toolbar vs cells/Channels-only.

**G. Lifetime ladder retired — no backfill (2026-08-07).** New founding grants always
land on Pro. Accounts already on lifetime Agency/Creator (or other ladder outcomes)
are left as-is. Confirm whether a one-off migrate to Pro is wanted.

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
  starts the design product tour (`Tour` / `?tour=true`). The other two have no target and render at the design's own locked opacity with
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
is no way to *rename* an organisation after signup. The name comes from the *Organization* field at
registration (`auth/register.tsx` → `organization.repository.ts`, DTO field still `company`) and
nothing in the app or the API can change it afterwards; there is no create-organisation endpoint
either. A second organisation only appears when somebody invites you from Settings → Teams.

The rail footer **always** shows the current organisation name (switch icon + truncated
label + chevron). The row is always clickable switcher chrome — with one org the menu lists
only that membership; with two or more you can change org. Billing’s globe
`OrganizationSelector` stays multi-org-only. Naming and creating organisations remains real
missing product, not a migration task. Teams unlocks invites only — it does not gate the name row.

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

> **Superseded, 2026-08-04.** All four have since been seen, with a seeded channel and six seeded
> posts, and looking at them found three defects that counting had passed as fine: a status badge
> reading "Connected:", three broken avatars, and a calendar that opened at midnight. The sentence
> above was the right thing to write at the time and the wrong thing to leave standing.

### Where the work sits — five stacked draft PRs

```
main ← pr1  #5  the visual migration + the harness
     ← pr2  #6  prices, the rename, the lifetime route
     ← pr3  #7  four defects the migration uncovered
     ← pr7  #8  Connections, and the two invented MCP commands
     ← pr10 #9  Channels, the posts panel, the guard fix
     ← pr11 #10 billing and lifetime, once the keys arrived
     ← pr12 #11 the design compared, and what real data found
```

**Split on 2026-08-04.** #9 had grown from about ten commits to forty-five and
its title described maybe a fifth of them — unreviewable. Split by moving branch
pointers rather than rewriting history, so every commit hash is unchanged and
the three ranges are contiguous: 12 · 16 · 17.

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

> **Done later the same day.** Six seeded posts made the grid judgeable: cards
> sit in their hour cells, the panel and the grid agree on the time, and
> `/posts/count` returned `{"scheduled":4,"draft":2,"published":0}` — matching
> the seed row for row, the first time that endpoint was checked against
> anything but zeros.

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

### `DeleteCircleIcon`: not a bug either, but it hides a real one

Second of the four looked at rather than reasoned about. It is a **white ellipse
with a red `#FF3535` mark on top** (`ui/icons/index.tsx:613–614`), sitting at the
corner of a media tile, revealed on hover.

The white is a backing disc — it exists so the mark stays legible over a
photograph, which is where this icon spends its life. On the light page
background the disc simply blends, and the red mark still carries the meaning.
**Not a bug.** Two of four suspects now cleared by looking.

**But the red is a raw hex in a component**, twice in that file, and the
non-negotiable about colour says otherwise. Worse, there is no token to move it
to: the palette has `pqWarn` and the amber family, and **nothing for danger**.
The billing tick had `text-pqOk` waiting for it; this has nothing.

So this is a token gap, not a component fix: `--danger` needs to exist in
`colors.scss` for both themes before `#FF3535` can go anywhere. Recorded as
that, rather than pointed at the nearest amber and called done.

### The red went to the token layer, and there was already a token for it

`#FF3535` appeared twice in `ui/icons/index.tsx` — `DeleteCircleIcon` and
`CloseCircleIcon`. My first note called this a missing token and said `--danger`
would have to be invented. **That was wrong**, and checking the design settled
it: `tokens.css:45` has `--warn:#f87171` and uses it for exactly this role. The
palette has no separate danger colour because it does not need one.

Ours already resolves it per theme — `#f87171` dark, `#dc2626` light — which the
fixed `#FF3535` never did. So both marks now take `fill="currentColor"` under
`text-pqWarn`, and the icons are theme-aware for the first time.

The white ellipse behind the mark **stays white**, with a comment saying why: it
is a backing plate for legibility over a photograph, not a fill.

Two hex literals gone, no new token, and `#FF3535` no longer appears anywhere in
the frontend.

**White-fill audit so far:** 42 occurrences → 4 icon components → two cleared by
looking (`NoMediaIcon`, `DeleteCircleIcon`), two left (`DragHandleIcon`,
`SettingsIcon`), both of which need a populated media library to be seen in
place.

### Plan & invoices — the last structural gap with the design, closed

`settingsVals()` names nine tabs; we had eight. This is the ninth.

**Two states, because the account can genuinely be in two situations** and
telling a founding member to "manage your subscription" would be nonsense:

- **Subscribed** — the plan and its channel count, and a button into Stripe's
  billing portal, which is where invoice history actually lives. `GET
  /billing/portal` already existed for the Billing screen's payment-method link.
- **Founding member** — no subscription, so no portal session to create and no
  invoices to list. It says what is true (one payment, nothing renews) and links
  to the lifetime page instead of offering a portal that would fail to open.

`GET /billing/charges` is deliberately unused. It is superadmin-only
(`billing.controller.ts:189`), so a tab built on it would answer 400 for every
ordinary user — that was traced two sessions ago and is the reason this tab
waited rather than being wired to the first plausible endpoint.

Gated exactly like the Billing screen: `isGeneral && billingEnabled &&
isOrgAdmin`. It does not appear on a self-hosted install, where there is nothing
to bill.

**Verified in both themes**: renders, picks the lifetime branch correctly for
this account, no overflow. The **subscribed** branch has not been seen — it
needs a real Stripe subscription, and it is marked as such rather than assumed.

`i18n 1061 → 1068`.

With this, every tab, page, overlay and chrome dimension the design specifies
now exists here. What remains is not structure: two icons and the calendar grids
need data, and a real card would exercise the purchase.

### Media, seen with files in it for the first time — and two real defects

Three test images uploaded (the owner's call, left in place). Grid: **3 tiles**.
List: **3 rows**. Both layouts render; the list view had been written and never
once seen.

Uploading them turned up something the source-run backend hides: `UPLOAD_DIRECTORY`
is `/uploads`, an absolute path that exists inside the container and nowhere on
a Mac, so `upload-simple` answered 500 with `ENOENT: mkdir '/uploads/2026/08/04'`.
An environment mismatch rather than a bug, fixed with a runtime override beside
the `DATABASE_URL` one that was already there.

**Defect 1: nothing ever recorded a file's size.** `Media.fileSize` has existed
with `@default(0)` since before this migration and `saveFile()` never took a size
argument, so every row read as zero. The list view's size line — written to show
nothing when the size was unknown — was therefore dead code that could never
display anything. The uploader has the number all along; it is now threaded
through both upload routes, the service and the repository.

Proved by before and after in one list:

```
pq-test-2.png → fileSize 956     (uploaded after the fix)
pq-test-3.png → fileSize 0       (before)
```

**Defect 2, mine, caught by the first real number.** The size line divided
straight to MB, so 956 bytes rendered as **"0.0 MB"** — and small files are most
of a media library. Now bytes below a kilobyte, whole kilobytes below a megabyte,
one decimal above. The row reads `Image · 956 B`.

Note the shape of this: the size formatter had been written, reviewed and
committed weeks of work ago and was wrong in a way no amount of reading would
have shown. It took one real file.

**Still open here:** thumbnails do not load, because the images live in the
override directory while the frontend serves `/uploads` from the container path.
That is this machine's configuration, not the app — worth stating so it is not
mistaken for a rendering bug later.

### A channel, and the channel detail seen for the first time

`scripts/seed-dev-channel.mjs` writes one placeholder Mastodon channel (owner's
call). Its token is the literal `dev-seed-not-a-real-token` and its name is
"Dev placeholder (not connected)", so it announces itself in the one place
somebody will definitely look — the channel list. `--revoke` removes it and
refuses to touch anything it did not write. Nothing schedules a post by itself,
so nothing will try to publish through it.

**The channel detail page rendered for the first time since it was built.**
Everything is there: the header, the three counters reading `0 / 0 / 0` from the
`/posts/count` endpoint added for exactly this, New post and Automations,
Publishing options, and the time-table editor with its three default slots.

**And it showed a copy bug in my own work.** The status badge read
**"Connected:"** — with a trailing colon. The existing `connected` translation
key is `"Connected:"` because elsewhere it is a *label prefix*, and I reused it
for a status badge. Now `channel_connected`, a key of its own; the old one is
untouched because other call sites depend on the colon.

That is the third defect this session found by putting real data in front of a
screen that had only ever been reasoned about — after the media size that was
never recorded and the "0.0 MB" formatter. None of the three were visible in the
source.

`api 149 · routes 28 · gates 12` unchanged, `i18n` +1, sweep reports zero
overflow across thirteen screens.

### The calendar opened on the small hours

With a channel in place the week grid could finally be looked at, and it opened
at **00:00** — an empty night, with everybody's actual day below the fold. This
account's own posting times are 05:00, 09:40 and 14:40; none of them were on
screen.

The prototype does not do this. `…dc.html:4693` scrolls the grid on mount:

```js
if (g && g.scrollHeight > g.clientHeight) { g.scrollTop = 7 * 78; return; }
```

Seven rows down — 07:00 — and it retries on animation frames until the rows
exist, because they are not laid out when the callback first runs.

Ported, with one difference: the offset is computed as `scrollHeight / 24 * 7`
rather than multiplying by a hardcoded 78px row. The grid is twenty-four hours
tall by construction, so seven twenty-fourths of it is 07:00 whatever the row
height becomes. A literal would have been right today and quietly wrong after
the next spacing change.

Verified: the grid now opens showing 08:00 through 13:00.

Also confirmed on the same screen, and never seen before: the channel column
with a channel in it, the posts panel's three tabs, and **"Pro tier"** at the
foot of the channel column — doc 03's third lifetime rule, in place.

### The composer, opened for the first time

`Create Post` had no handle, so the composer could not be photographed even
after a channel existed — the dialog cannot be reached by URL. It has
`data-pq="create-post"` now, for the same reason add-channel does.

Opened, it is the design's two-pane shape: Create Post beside Post Preview, the
editor with its toolbar, tag and repeat controls, the date, Save as draft, and
the CTA. All of it renders at 1440 with no overflow.

**Two bright magenta elements looked wrong and are not.** The AI button and
"Add comment / post" use `bg-pqPink`, and `tokens.css` in the handoff defines
`--pink:#e0189e` — ours is the same value in both themes, and `--new-ai-btn`
points at it. The design chose that colour; it is not a survivor of the old
brand.

That is the third suspicion this session settled by looking rather than
reasoning — after `NoMediaIcon` and `DeleteCircleIcon`. All three would have
been "fixed" into breakage by a confident pattern match.

### Six posts, and the calendar finally judged with something on it

`scripts/seed-dev-posts.mjs` writes six posts — four QUEUE, two DRAFT — spread
across the working week at hours somebody would actually pick, so the grid is
judged on a realistic distribution rather than six cards in one column. They
attach to the placeholder channel, whose token is invalid, so none can publish.

**`GET /posts/count` verified against real rows for the first time.** It was
added during this migration specifically for the channel counters and had only
ever been seen returning zeros:

```
{"scheduled":4,"draft":2,"published":0}     — exactly the six seeded
```

**The calendar populated correctly**: cards in their hour cells with time and
content, the posts panel listing four scheduled rows, and the times agreeing
between panel and grid — which is the clock bug fixed back at the tour, still
holding with real rows.

**And it showed a defect in my posts panel.** The avatars rendered as broken
images while the calendar's own cards were fine. The difference is one
expression: `calendar.tsx:1200` writes
`src={post.integration.picture! || '/no-picture.jpg'}`, and my panel wrote
`src={post.integration?.picture}`. A channel with no picture — which is every
channel until someone sets one — left `src` empty, and the element broke before
any fallback could help.

Fixed in the panel and in both avatars on the channels page, which I had written
the same way. `/no-picture.jpg` has been in `public/` all along; I simply had
not used it.

Worth noting what caught this: not the count, which was right, and not the
types. Only looking at it.

### The last two icons cannot be judged on this machine, and that is the answer

`DragHandleIcon` and `MediaSettingsIcon` live in the media *picker*, not on the
`/media` page — which is why they never appeared in any earlier count. The
picker opens from one control and had no handle; it has `data-pq="insert-media"`
now, and opened for the first time.

What it shows settles less than hoped. Both icons sit over a media thumbnail,
and **on this machine the thumbnails do not load** — the files are in the
override upload directory while the frontend serves the container path. There is
no photograph behind them, so "is white right over a photograph" cannot be
answered by looking here. Anything I said about them would be reasoning dressed
as observation.

What the same screenshot *does* settle: the `DeleteCircleIcon` mark, moved to
`pqWarn` earlier today, reads clearly as red against the light theme's picker.
That fix is confirmed in place.

**Position:** two of four white-fill icons cleared by looking, one fix confirmed,
two undecided and blocked on a working uploads path rather than on any code
question. Written down as undecided instead of quietly resolved, because the
whole point of the exercise was to stop reasoning about colours nobody had seen.

---

## Where this stands

Every tab, page, overlay, chrome dimension and calendar view the design specifies
now exists here, and the four the log once listed as unverified — the
founding-member surface, the four lifetime rules, the Media list rows and the
composer — have been seen.

**What the last day actually taught, since it changed how the rest was done:**
putting real data in front of a screen found **five defects** that reading the
source could not, and cleared **three suspicions** that reading the source had
raised.

| found by looking | cleared by looking |
|---|---|
| `Media.fileSize` was never recorded by anything | `NoMediaIcon` — white glyphs on lilac, correct |
| the size formatter rendered 956 B as "0.0 MB" | `DeleteCircleIcon` — white disc is a backing plate |
| the status badge read "Connected:" | the composer's magenta is the design's own `--pink` |
| three avatars broke when a channel had no picture | |
| the calendar opened at midnight | |

None of the five were visible in the source, and none of the three would have
survived a confident pattern match.

### Open, and what each waits on

**The owner:** `prisma db push` — this database's enum does not know
`CREATOR`/`GROWTH`/`AGENCY`, which is why the lifetime seed had to pass
`--tier PRO`. Until it runs, the entire tier rename is untestable locally, and
that is the largest single risk left in this migration. Then a real card, for the
one path deliberately never exercised.

**A working uploads path:** two of the 42 white fills sit on media thumbnails
that do not load on this machine, so they are recorded as undecided rather than
reasoned about.

**A real Stripe subscription:** `active`, `canceling`, `payment_failed`, `ended`
and `discount`. The account is lifetime, which is the one state that cannot show
the others.

### Seeded data, left in place

`grant-lifetime.mjs`, `seed-dev-channel.mjs` and `seed-dev-posts.mjs` each have
`--revoke` and each refuses to touch anything it did not write. The channel is
named "Dev placeholder (not connected)" and carries an invalid token; the images
are `pq-test-*.png`. Nothing about them is subtle, on purpose.

### Drag and drop: the test was wrong, not the calendar

The plan said drag would be verified with a real mouse, so `ui-shot.mjs` gained
`--drag`: press, twelve interpolated moves, release. Dragged a seeded post to a
different cell and checked the database.

**Nothing moved.** Every `publishDate` was unchanged.

The tempting conclusion is that drag and drop is broken. It is not what the
evidence says. The calendar uses **react-dnd's HTML5 backend** (`useDrag`,
`react-dnd-html5-backend`), which listens for `dragstart`/`drop` — a different
event family from the pointer events CDP's `dispatchMouseEvent` produces. The
two never meet, so the harness could not have moved anything regardless of
whether the feature works.

Exercising HTML5 drag over CDP needs `Input.setInterceptDrags` and
`Input.dispatchDragEvent`. That is not built here.

**So the honest state is: drag and drop is still unverified**, and this is the
one item in the migration where a test exists and proves nothing. The limitation
is written into the flag's own comment so the next person does not read a green
run as a passing one — a harness that reports success for something it cannot
reach is the exact failure the api and i18n collectors already taught this
project once.

### The tier rename finally ran, and `db push` was the wrong way to get there

With database authority granted, the obvious move was `prisma db push`. Diffed it
first. The three enum values this needs require **no** drops — but the push
carries **22 more statements that do**, every one against `mastra_ai_spans` and
`mastra_scorers`: tables the AI agent framework creates at runtime and which
`schema.prisma` does not describe, so Prisma wants them gone.

So three targeted statements instead, and nothing else touched:

```sql
ALTER TYPE "SubscriptionTier" ADD VALUE IF NOT EXISTS 'CREATOR';  -- + GROWTH, AGENCY
```

**Then `scripts/migrate-tiers.mjs` ran for the first time since it was written.**
It has been the migration's largest single risk — it moves live subscriptions off
retired tier names — and it could never be executed, because its target values
did not exist in this database. First run reported "Nothing to move", correctly,
since the only row was PRO and PRO keeps its name. So a row was deliberately set
to `STANDARD` to give it work:

```
[dry] would move 1 × STANDARD -> CREATOR
      moved 1 × STANDARD -> CREATOR
after: CREATOR 1 — 1 subscriptions, all accounted for
```

Verified in the database, not from the script's own output.

And the lifetime ladder now runs on real names: `grant-lifetime.mjs` without
`--tier` gives **FREE → CREATOR, 5 channels**, and `/user/self` reports
`CREATOR`. Until an hour ago that path threw
`invalid input value for enum "SubscriptionTier": "CREATOR"`.

**What this closes:** the item that has sat in "waiting on the owner" longest,
and the one I called the largest remaining risk in this migration. It is neither
now.

### Stripe had nothing to sell, and two reasons why went unnoticed

The test account held one price. `getPackages()` returned `{}` and every
subscription state was unreachable. Two separate causes, both stale since before
this migration:

**1 · The subscribe flow matches on `nickname`.** `stripe.service.ts:304` finds a
price with `p.nickname === body.billing + ' ' + body.period` — `"CREATOR MONTHLY"`.
No such price existed, so **no subscription could ever be created**, which is why
doc 03's six subscription states had never been seen by anybody.
`scripts/stripe-test-fixtures.mjs` creates the eight (four tiers × two periods)
with amounts read from `pricing.ts`. It refuses to run unless the key starts
`sk_test`, and that check is first, before anything is read.

**2 · `getPackages()` asked for retired tiers.** Its `lookup_keys` were
`standard_monthly`, `standard_yearly`, `pro_monthly`, `pro_yearly` — and STANDARD
was retired by the rename. Two of four keys named a plan nobody can buy. Now
built from `pricing`, filtered to what is on sale, so the next rename cannot
leave it behind.

**3 · And then it still returned nothing, which found a third.** With the keys
right, every package came back with `price: null`: the amount was read only as
`p.tiers[0].unit_amount`, which exists on a *tiered* price. An ordinary flat
price — the normal shape, and what any straightforward Stripe setup produces —
had no amount at all. It falls back to `unit_amount` now.

```
before   GET /user/subscription/tiers → {}
after    → month: $20, $33, $49, $99 · year: $132, $264, $396, $792
```

Three defects stacked on each other, and the outermost one hid the other two. It
took creating real fixtures to reach any of them.

### `active` and `canceling`, seen at last — and the money was printed wrong

The billing screen reads the **local** subscription row, not live Stripe
(`/user/subscription` → `getSubscriptionByOrganizationId`). So two of doc 03's
states could be produced directly, which is a good deal cheaper than driving
Stripe checkout and just as true to what the UI does.

**`active`** — every rule in doc 03's row holds: four cards in ascending price,
**"Current Plan"** on the subscribed tier, and the portal + Cancel row beneath.
`AGENCY` reads **"Unlimited channels"**, which is the owner's decision rendering
for the first time, and there is no duplicate feature line.

**`canceling`** — all four of doc 03's clauses, verified together:

- *"Your subscription will be canceled at 22 Aug, 2026"* ✓
- *"You will never be charged again"* ✓
- **Reactivate subscription** replaces the plan card's button ✓
- the red Cancel button is gone ✓
- and the tier is **kept**, not dropped to FREE ✓

**One defect, and it was on every card of both states.** "(Pay Today $0.0)" —
`toFixed(1)`, one decimal, which is not how money is written anywhere. Whole
dollars now print whole and anything with cents keeps two: **"(Pay Today $0)"**.

It had been on that screen since before this migration, in the one place a
person looks hardest before paying.

Account restored to lifetime CREATOR afterwards.

### `ended`: the behaviour was right, the words were never written

Doc 03 asks for a lapsed paywall — *"Pick up where you left off"*, no trial
checkmarks, full price due today. Searched for it: **zero occurrences** of that
copy anywhere in the frontend. The state had never been built.

But half of it already worked. `first.billing.component.tsx:184` gates the three
trial checkmarks on `user.allowTrial`, so an account that has already used its
trial correctly sees none — nobody was being offered a trial they cannot have.
What never followed that signal was the **headline**, which said "Grow your
social presence" to a returning subscriber who has already grown one.

It follows it now:

```
allowTrial  true  → "Grow your social presence with PostQueen"
allowTrial  false → "Pick up where you left off with PostQueen"
```

Verified by producing the state — subscription deleted, `allowTrial` false — and
reading the rendered headline back.

**Not built: the amber "Your subscription ended on…".** In this state the
subscription row is gone, so nothing on the client knows the date. Same rule as
the lifetime footnote: the sentence that can be true is written, the one that
would need an invented date is not.

Account restored to lifetime CREATOR.

### `payment_failed` and `discount`: built, and one of them untranslated

**`payment_failed` exists and matches doc 03 word for word** —
`main.billing.component.tsx:446` handles the `portal` response from
`/billing/subscribe` and raises *"We could not charge your credit card, please
update your payment method"* / *"Update"* / *"Payment Method Required"*.

All three strings were **hardcoded English**. The same class as the plan feature
list fixed earlier today, and on a worse surface: this dialog only ever appears
to somebody whose card was just declined, which is the moment a person least
wants to read a language they do not speak. Now translated.

**`discount` cannot be reached here at all**, and honestly: `checkDiscount()`
returns `false` immediately unless `STRIPE_DISCOUNT_ID` is set, and then lists
the customer's *charges* — so it needs both a coupon configured and a payment
history. Neither exists on this account.

**Both remaining states need a completed checkout with a card**, which is the
one thing deliberately left to the owner. They are built; they are not seen. Of
doc 03's ten states, **six have now been rendered and looked at**
(`not_started`, `trial`, `active`, `canceling`, `ended`, `lifetime`), two are
built but need a real payment (`payment_failed`, `discount`), and two need
subscription shapes this account cannot hold at once (`member_no_plan`,
`lifetime_trial`).

### The thumbnails were never going to load, and a stale process was why

`--loaded <selector>` added to `ui-shot.mjs`: of the images matching it, how many
actually **decoded**. `--count` says an `<img>` is in the DOM; a broken thumbnail
counts exactly the same as a working one until something asks `naturalWidth`.
First run: **0/4**.

The frontend serves uploads from its own route handler
(`app/(app)/api/uploads/[[...path]]/route.ts`) which reads `UPLOAD_DIRECTORY` from
the *frontend's* environment — and it was reading `/uploads`, the container path,
despite being restarted with an override.

Reading the process environment directly rather than trusting the restart:

```
pid 57671 → UPLOAD_DIRECTORY=/uploads
```

**A stale Next process was still holding port 4200.** Every "frontend restarted"
in this session had been landing beside it, not replacing it. Killed by port
rather than by command pattern, restarted, and the override is now in the
environment of the process actually serving. **4/4 loaded.**

Worth naming the failure: I had restarted that server perhaps a dozen times
today and never once checked that the process answering was the process I
started.

**And with real images behind them, the white-glyph question is answered.** The
delete badge — white ✕ in a `pqWarn` circle — and the maximize glyph both read
clearly over a coloured photograph in the light theme. That was the open
question about `fill="white"` on media tiles, and it is settled by looking at
exactly the surface it was asked about.

The two icons still formally undecided (`DragHandleIcon`, `MediaSettingsIcon`)
live in the editor's inline media strip, which needs media attached to a post —
a narrower gap than before, and the same pattern demonstrably works.

### Drag and drop, second attempt: right events, still no proof

`--drag` now does what it should have done the first time:
`Input.setInterceptDrags` makes Chrome hand back the drag payload rather than
performing the drag, and `Input.dispatchDragEvent` drops that payload on the
target. That is the event family react-dnd's HTML5 backend actually listens for.

It also found that my first target was wrong — the drop was aimed at another
post card. The real drop zone is `[data-cell="1"]` (`calendar.tsx:745`,
`ref={drop}`), and it carries `data-filled` so an empty cell can be picked.

**And it still does not move anything.** Chrome never fires
`Input.dragIntercepted` for a press-and-move on a post card, so there is no
payload to drop and no `publishDate` changes. Whether that is the gesture, the
element under the press, or how react-dnd binds its source has not been run to
ground.

What is better than yesterday: it **says** "drag was not intercepted" instead of
completing quietly. An unchanged database after a silent run reads exactly like
a passing test, and that is the shape of failure this project has already been
caught by twice.

**Drag and drop remains the one interaction in this migration that is built,
present in the DOM, and unverified.**

### Final comparison, with everything in place

The sweep now runs against an account that has a subscription, a channel, six
posts and four images whose thumbnails load:

```
13 screens · 3 widths · 2 themes · 78 shots
paywall shots: 0     horizontal overflow: 0
```

The only two ⚠ lines left are the app's own redirects — `/agents → /agents/new`
and `/billing → /launches`, the latter being doc 03's lifetime rule doing its
job.

Settings checked in both themes, since it was named specifically: three groups,
nine tabs including the **Plan & invoices** added today, Teams correctly absent
on a CREATOR plan (`tier.team_members`), toggles on brand, the column hairline
and spacing intact, and text at `rgb(24,24,27)` light / `rgb(237,237,240)` dark.

**This is the state the owner will open the app into**, and it is worth being
plain about what that means: every screen the design specifies renders with real
data in it, at every width, in both themes, with nothing overflowing. What is
*not* claimed is that every interaction has been exercised — drag and drop
specifically has not, and says so.

### Drag and drop: three mechanisms tried, none proved it

For completeness, because "unverified" is a weaker statement than the work
behind it:

1. **Pointer events** (`Input.dispatchMouseEvent`, press + interpolated moves +
   release). Moved nothing. react-dnd's HTML5 backend listens for
   `dragstart`/`drop`, not pointer events, so these never reached it.
2. **CDP drag interception** (`Input.setInterceptDrags` +
   `Input.dispatchDragEvent`). Chrome never fired `Input.dragIntercepted` for a
   press-and-move on a post card, so there was no payload to drop.
3. **DOM drag events in the page** — a single `DataTransfer` carried across
   `dragstart → dragenter → dragover → drop → dragend`, which is how testing
   libraries drive react-dnd. Events dispatched; no `publishDate` moved.

The drop zone was found correctly along the way — `[data-cell="1"]` at
`calendar.tsx:745`, carrying `data-filled` and `data-past`. The last attempt
aimed at a future empty cell and the selector matched nothing, which suggests
`data-past` does not render the value I assumed, and is where a fourth attempt
should start.

**Left as the one interaction that is built, present in the DOM, and
unverified.** The tool keeps the DOM-event version, which is the closest of the
three and reports what it dispatched, so the next attempt begins further along
than this one did.

What is *not* claimed anywhere: that drag and drop works. It may well; nothing
here has shown it.

### Drag and drop, fourth attempt: it moved

```
before  2026-08-06T05:15  Weekly build thread
after   2026-08-04T21:00  Weekly build thread
```

A real `publishDate`, rewritten in the database by a drag. **The calendar's
central interaction is verified**, and it is the last thing in this migration
that was built, present and unproven.

Nothing about the mechanism changed from the third attempt — DOM drag events
with a shared `DataTransfer` were already right. **Both selectors were wrong.**

- The target was `[data-past="false"]`. `calendar.tsx:933` writes
  `data-past={isBeforeNow ? '1' : '0'}`, so the correct value is `"0"` and my
  selector had been matching nothing at all. Counted before trying this time:
  **123** empty future cells.
- The source was `[draggable]`, which matches any element carrying the
  attribute. `useDrag`'s ref sits on one specific element; `[draggable="true"]`
  finds it. **6** cards.

So three of the four attempts failed on things that had nothing to do with drag
and drop, and the second was a real dead end (CDP interception). The lesson is
narrower than "verify by looking": **count what your selector matches before
concluding anything from what it does.** A selector matching zero elements and a
feature that is broken produce identical evidence.

Ten of the eleven interactions and states this migration has chased are now
verified against real data. The last is the card payment, which is the owner's.

### `lifetime_trial`, which the account was already in

No state to produce — the account is lifetime *and* trialing, which is exactly
doc 03's `lifetime_trial` row. It only needed looking at, and looking at it
settles the half of the founding-member copy that had never rendered:

```
[data-founding-member] → "Founding member … Thank you for b…"
subtitle               → "Nothing has been charged yet."
facts                  → 3
```

That subtitle is the **trial** branch. The paid branch ("One payment, done") was
seen earlier today; both variants of that block have now rendered, and the
account that saw each was genuinely in the state that selects it. Three widths,
both themes, no overflow.

Getting this wrong would have told somebody mid-trial that they had already been
charged — which is why the branch reads `isTrailing` rather than assuming.

### `member_no_plan`, the last state that could be reached

It needed a second person in the organization, and there had only ever been one.
`scripts/seed-dev-member.mjs` adds one with role `USER` — no password, an
address on the reserved `.invalid` TLD, and a `--revoke` that takes both the
membership and the user away. Its token was minted with the app's own
`JWT_SECRET` so nothing about the session is special-cased.

With the subscription removed and the app viewed as that member, doc 03's row
holds:

- *"A subscription is needed"* ✓
- *"This workspace does not have an active plan. Only an admin … please ask them
  to take a look."* ✓
- **no plan picker and no pay bar** — `[data-plan-card]` counts **0**, which is
  the part that distinguishes this from the paywall a member must never be shown
- Logout in the header ✓

The org *switcher* doc 03 lists is correctly absent for this member (one
organization — nothing to switch between). The rail footer still shows the
organisation **name** as a static row; only the chevron/menu is multi-org.

**Doc 03's ten states are now all accounted for.** Eight have been rendered and
looked at — `not_started`, `trial`, `active`, `canceling`, `ended`, `lifetime`,
`lifetime_trial`, `member_no_plan`. The two left, `payment_failed` and
`discount`, both need a completed card payment, which is the owner's to make.

Member removed and the account restored to lifetime CREATOR.

---

## Running this from source — four things `.env` does not tell you

Every one of these cost time in this session, so they are written as what
happened rather than as advice.

**`nest start` must run from `apps/backend`.** From the repository root it picks
up the wrong tsconfig, reports 5950 errors, and — before failing — writes **1484
compiled `.js`/`.js.map` files into the source tree**. One of them was
`apps/frontend/src/proxy.js`, sitting beside `proxy.ts`; Next served the stale
copy, the auth middleware stopped seeing the session cookie, and an hour went
into blaming cookies.

**`UPLOAD_DIRECTORY` must be overridden, for both apps.** `.env` sets `/uploads`,
which exists inside the container and nowhere on a Mac. The backend answers 500
with `ENOENT: mkdir '/uploads/…'`, and the frontend serves uploads from its own
route handler reading the same variable — so both need it or thumbnails silently
fail to decode while every `<img>` still counts as present.

**`DATABASE_URL` must be overridden.** `.env` points at the container network;
from source it is `localhost:15432`.

**Check the port, not the process.** A stale Next server can hold 4200 while
`pkill -f "next dev"` reports success, and every restart lands beside it. This
went unnoticed across about twelve restarts. `lsof -ti:4200` is the honest check.

## The seeded data, and how to remove it

Four scripts, each with `--dry` and `--revoke`, each refusing to touch anything
it did not write:

| script | what it left |
|---|---|
| `grant-lifetime.mjs` | a lifetime CREATOR subscription |
| `seed-dev-channel.mjs` | "Dev placeholder (not connected)", invalid token |
| `seed-dev-posts.mjs` | six posts, one of them moved by the drag test |
| `stripe-test-fixtures.mjs` | eight prices, Stripe **test mode** only |

To clear everything, in this order:

```
node scripts/seed-dev-posts.mjs   --org <id> --revoke
node scripts/seed-dev-channel.mjs --org <id> --revoke
node scripts/grant-lifetime.mjs   --org <id> --revoke
node scripts/stripe-test-fixtures.mjs --revoke      # archives, never deletes
```

Run each with `--dry` first; they say what they would remove. The three test
images (`pq-test-*.png`) are deleted from the Media screen.

**Connecting a real channel:** remove the placeholder first, or the calendar
keeps a row that can never publish.

---

## The tier × state matrix — 2026-08-04

Everything in this migration had been looked at on **one account in one state**:
lifetime CREATOR, trialing, one channel. This walked the four paid tiers across
trial / active / lifetime and then the surfaces that only exist off the happy
path. Every claim below is a count, an HTTP status or a database row.

### What the walk proved

| | settings tabs | Teams | Auto Post | generator button |
|---|---|---|---|---|
| CREATOR | **9** | no | no | 1 |
| GROWTH | **11** | yes | yes | 1 |
| PRO | **11** | yes | yes | 1 |
| AGENCY | **11** | yes | yes | 1 |

Billing's "Current Plan" landed on the right card in all twelve combinations,
and the channel column's `{Tier} tier` line read Creator / Growth / Pro / Agency
in the three lifetime ones and was absent in the other nine, which is correct —
it is gated on `isLifetime`.

**A correction to this session's own plan.** It predicted the composer's AI
controls would disappear on CREATOR. They do not, and should not: `pricing.ts`
gives CREATOR `ai: true` and only `image_generator: false`. The generator button
is gated on `ai`, so it is present on every paid tier; what CREATOR loses is the
picture-generator section inside the design editor (`polonto.tsx:95`). The
prediction was wrong, the app is right.

### Four things that were broken, and are not now

**The X trial lock answered 500.** `assertConnectAllowed` threw a bare `Error`,
which Nest renders as `{"statusCode":500,"message":"Internal server error"}` —
the sentence explaining the lock never reached anyone, and the frontend showed a
generic failure. It now throws `HttpException(…, 406)`, which is the status this
app already uses for "blocked *because* you are on trial"
(`media.service.ts:99`) and which `layout.context.tsx:91` already handles by
offering to end the trial and charge now. Measured, on a GROWTH trial:

```
/integrations/social/x            406  "X unlocks when your free trial ends…"
/integrations/social/linkedin     200  (not locked)
/integrations/social/x?refresh=…  200  (an existing channel reconnecting)
```

Before this could be reached at all, the channel-limit policy answered first —
six channels against CREATOR's five — which is why the lock had never once been
seen. It needs headroom under the limit to be reachable.

**The founding member was told they had been charged.** `FinishTrial` had one
completion message: *"You trial has been successfully finished and you have been
charged."* For a founding member nothing is charged — `billing.controller.ts:79`
ends the trial locally precisely because there is no Stripe subscription. The
dialog now branches: the founding-member wording carries the same amber
FOUNDING MEMBER badge as the billing surface, and the charged wording is
unchanged in meaning. It was also still in the pre-migration visual language;
it is on the token layer now.

Two smaller things came out of the same dialog. "Close window" only renders when
`window.opener` exists — opened from the X panel it is an overlay on the app,
where `window.close()` does nothing. And the user is revalidated **on close**,
not on completion: revalidating while the dialog was open unmounted the locked
panel, and the dialog is rendered inside it, so the thank-you appeared and
vanished in the same frame. That regression was introduced and removed inside
ten minutes; it is written down because the screenshot is the only reason it was
noticed.

**The default organization was whatever Postgres felt like.** This one was found
by accident and is the most serious. `getOrgsByUserId` had no `orderBy`;
`auth.middleware.ts:92` falls back to `organization[0]` when a request carries no
`showorg`. With one organization that is stable by luck. The moment a second one
existed on this account, `/user/self` began resolving to the **new, empty**
workspace with no user action at all — and the sweep came back with the checkout
paywall on all ten signed-in screens. Ordering is now `createdAt: 'asc'`, so the
fallback is the organization the account started with, which is what that line
always meant.

Anyone in more than one workspace could have been dropped into a different one
between requests. It is upstream code and predates this migration.

**`ui-shot.mjs` leaked a Chrome per failed start.** The connect call sat outside
the try/finally, so a browser that never exposed a debugging target left both the
process and its temp profile behind — **2,935 profile directories** had piled up,
and the pile is itself a reason the next start fails. Cleaned up and closed.

### What was walked, and what it cost to see

- **34 add-channel provider guides** — every one opens a step, every one renders
  exactly one connect control, 21 carry a requirement note. One browser session,
  one async `--eval` that clicks each tile and comes back.
- **17 Connections panes** — all open with real copy; 15 carry a code block,
  `webhooks` and `oauth` deliberately do not.
- **The over-limit channel** — six channels on CREATOR's five. The sixth draws at
  `opacity: 0.5` with "This channel is disabled, please upgrade your plan to
  enable it.", and the composer's picker excludes it (10 images = 5 channels ×
  avatar + badge, not 12). Never seen before this.
- **A post written from the composer** — channel picked, text typed with real key
  events, "Add to Calendar" pressed. `state: QUEUE`, `publishDate` matching the
  picker, its own group id. Every post before this one was written by a script.
- **The workspace switcher** — two organizations, the menu lists both with a tick
  on the current one, switching lands on the second workspace's first-billing
  checkout, which is the correct screen for an organization with no subscription.
- **Analytics · Plugs · Third-party** — all three render their empty states on
  the token layer. They cannot be compared against the prototype's populated
  versions, because a Mastodon placeholder supports neither analytics nor plugs.
  **Recorded as not compared, rather than compared and passed.**

### Tooling changed here

`ui-shot.mjs` gained `--eval` (async, so one expression can walk 34 tiles) and
`--type` (a real click plus `Input.insertText`, because assigning `textContent`
to a managed editor leaves React's state untouched and the submit button
disabled). `--click` and `--type` now run **in command-line order** and `--click`
may repeat; previously a second `--click` was silently dropped and typing always
happened after every click, so the submit press landed before there was anything
to submit and the modal simply stayed open.

`scripts/dev-state.mjs` is new: it puts an organization into any (tier, trial,
lifetime) combination and `--reset` returns it. `seed-dev-channel.mjs` gained
`--count N`, `--disable-over K` and `--revoke --keep N`. `seed-dev-org.mjs` is
new and gives an account a second, empty workspace.

**One tooling change was tried and reverted.** The gates collector counts the
literal `isTrailing`, so a comment *explaining* a gate reads as a use of it and
moved the count from 6 to 7. Stripping comments before counting looked obvious;
one perl pass over 800 files ate a regex literal here and a protocol-relative
string there, and the i18n list lost eleven real keys while claiming to have
found a behaviour change. The collector is unchanged and the rule is on the
writing instead — do not name a gate in prose beside the code that uses it.

### Baseline moved, on purpose

`i18n 1073 → 1080`. Seven keys, all from `finish.trial.tsx`, which had none: it
was hardcoded English before this. `gates`: `user.isLifetime` 8 → 9, the founding
member branch in the same file. `api`, `routes` and both type checks unchanged.

### `.env` on this machine no longer starts the backend

Worth knowing before the next `pnpm dev`. The file now names `localhost:5432`
and `localhost:6379`, but Postgres and Redis are reachable only through the
`pq-pg-bridge` / `pq-redis-bridge` containers on **15432** and **16379**; and
`NEXT_PUBLIC_BACKEND_URL="/api"` — the frontend-only setup — makes
`start.mcp.ts:50` throw `ERR_INVALID_URL` on `new URL('/mcp-oauth', '/api')`
before the backend ever listens. It runs here with all three overridden.

Editing `.env` was refused by this environment's guard, so the values are
**not** fixed in the file. Three lines, from `.env.example`:

```
DATABASE_URL="…@localhost:15432/postqueen-db-local"
REDIS_URL="redis://localhost:16379"
NEXT_PUBLIC_BACKEND_URL="http://localhost:3000"
```

### Still not seen

A real card payment, and with it `payment_failed` and `discount`. Unchanged from
before: it is the owner's to make.

### Where the account was left

Lifetime CREATOR, trialing, one placeholder channel, seven posts (six seeded plus
the one written from the composer), four test images, and a second empty
workspace named "Second workspace (dev seed)". `seed-dev-org.mjs --revoke`
removes that last one; with the ordering fix above it is harmless to keep, and it
is the only way the switcher renders at all.

---

## The card path, and three things it was hiding — 2026-08-04

`payment_failed` and `discount` had been "waiting on the owner's card" since the
beginning. They were not. Stripe **test mode** is a card — `pm_card_visa` — and
the only reason the path had never run is that nothing could deliver a webhook.

**`STRIPE_SIGNING_KEY` was not set at all.** `stripe.controller.ts:25` validates
every delivery with it, so with no value the `/stripe` route could not accept a
single event. No subscription could ever have been written from Stripe on this
machine, and none had been. The Stripe CLI is not installed either, and a hosted
endpoint cannot reach localhost — so `stripe-test-drive.mjs` makes the call for
real, pulls the resulting event back out of `stripe.events.list()`, and posts it
to `/stripe` signed with `generateTestHeaderString`. The events are Stripe's own;
only the transport is local.

### Every state, walked

| state | how | result |
|---|---|---|
| `trial` with a card | real subscription, `trial_period_days: 7` | local row `CREATOR · 5 ch`, org `isTrailing` |
| `active` | the app's own **End free trial** → Stripe → `customer.subscription.updated` | trial cleared, subscription active |
| `canceling` | cancel at period end | `cancelAt` set; the card swaps Current Plan for **Reactivate subscription** |
| back to `active` | reactivate | `cancelAt` null again |
| `discount` | the app's three-step cancel chain, accepting the offer | 50% coupon on the Stripe subscription |
| `ended` | cancel now | local row deleted, paywall in lapsed mode |

The cancel chain reads exactly as doc 03 describes it: *"Are you sure you want to
cancel your subscription?"* → *"Before you cancel — Would you accept 50% discount
for 3 months instead? 🙏🏻"* → feedback. Reaching the offer at all needs
`STRIPE_DISCOUNT_ID`, which was also unset; without it `checkDiscount` returns
false on its first line and the offer never appears.

### Three defects, all on money

**Every upgrade said "(Pay Today $0)".** `prorate()` passed `proration_date`
*and* `billing_cycle_anchor: 'now'`, and Stripe rejects the pair — *"You cannot
specify `proration_date` when `billing_cycle_anchor=now`"*. The call therefore
threw **every time**, for every customer, and the `catch` returned `{price: 0}`.
The plan cards printed that as fact. With the parameter removed:

```
GROWTH  (Pay Today $0)        credit exceeds the cost — genuinely nothing
PRO     (Pay Today $4.51)
AGENCY  (Pay Today $29.51)
```

Anyone upgrading from Creator to Agency was told it was free today.

**Accepting 50% off left no trace.** The coupon went onto the Stripe
subscription and nothing ever read it back, so the toast was the only evidence
it had worked; a reload and the screen looked untouched. Doc 03 asks for "a
visible active-discount state on Billing", and the prototype draws it as a green
strip with the old price struck through beside the new one. That is now what it
is: `getActiveDiscount()` on the service, carried on the existing
`/user/subscription` response, rendered as `[data-discount-active]`.

**The checkout offered "1000000 channels".** AGENCY stores unlimited as a very
large number. `main.billing.component.tsx:104` already read it that way; the
checkout's own feature list did not, so the fix had been applied to one of the
two screens that share the same wording. Both say "Unlimited channels" now.

**And the Pro card had no POPULAR badge** — `badgeDisplay: key === 'PRO'` in the
checkout prototype, the only steer that screen gives. Added.

### Compared against the checkout's own prototype

`design/handoff/design/PostQueen Checkout (First Billing).dc.html` had never been
opened in this migration. Rendered side by side, with `allowTrial` on, the two
agree on the things that matter: *"Pay $0 Today – Start your free trial!"*, `Due
today $0.00`, *"Then $20.00 on August 11, 2026"*, the cancel-anytime line, the
FAQ's first entry appearing only with a trial, and the sticky bar. The feature
lists match the prototype's `feats()` condition for condition.

Where they differ, and these are **not** built:

- the design's header carries a "Checkout" label and a Help menu; ours has
  neither
- the hero reads *"Your first 7 days are free"* with a supporting line; ours
  reads *"Grow your social presence with PostQueen"*
- the design offers *"Switch to yearly and get 4 months free — Switch"* as a
  strip with an action; ours puts "Up to 5 months free" on the toggle
- the design's order summary shows the trial credit as its own `-$49` line
- log-out from checkout is confirmed in the design (*"Your checkout is not
  finished"*); ours logs straight out

### Two gaps in `ended`, recorded rather than half-built

Doc 03 wants the lapsed paywall to carry an amber *"Your subscription ended
on…"* and to offer the saved card with *"Use another card"*. Neither is there.
Both need the end date, and `deleteSubscriptionByCustomerId` is a **hard**
delete — the row is gone, so nothing local knows when it happened. Doing it
properly means either soft-deleting (a schema change on a live system) or
reading the cancellation back from Stripe on the paywall. That is a decision
about production data, not a restyle, so it is written down instead of guessed.

`payment_failed` is still unreached: it needs `/billing/subscribe` to answer
`{portal}`, which happens when Stripe refuses to update a subscription whose card
has failed. The dialog it opens exists and is wired
(`main.billing.component.tsx:465-479`); it has not been seen.

### `.env` needs two more keys

Neither is set, and both are silent when missing:

```
STRIPE_SIGNING_KEY="whsec_…"    # from `stripe listen`, or the webhook endpoint
STRIPE_DISCOUNT_ID="…"          # the 50% retention coupon id
```

Without the first, no Stripe event can ever be accepted. Without the second, the
retention offer in the cancel chain never appears.

### Baseline

`i18n 1080 → 1084` (`billing_popular`, `discount_active`, `discount_until`,
`discount_forever`). `gates 12 → 14` — `tier.month_price` and `tier.year_price`,
both from the discount banner working out what the old price was. `api`,
`routes` and both type checks unchanged; sweep clean across 13 screens.

### Both keys are in `.env` now — and one of them is a placeholder

Verified by starting the backend with **no overrides at all** and running a full
cycle from the file: a PRO subscription created in test mode, its real
`customer.subscription.created` accepted (201), the local row written
(`PRO · 30 ch`), `check-discount` returning the signed offer, and proration
answering `$50` for PRO → AGENCY.

`STRIPE_SIGNING_KEY` is the literal string `whsec_...`. That is enough here,
because the replay harness signs with the same value and `constructEvent` only
asks that both sides agree — so every local test above is real. It is **not**
enough the moment Stripe itself delivers: Stripe signs with the secret its own
webhook endpoint was issued, and anything else is rejected. Before this reaches
a public URL the value has to come from the Stripe dashboard's endpoint (or from
`stripe listen`, which prints one for local forwarding).

`STRIPE_DISCOUNT_ID` is `G9mLivv8`, a 50%-for-3-months coupon created in **test
mode**. A live deployment needs a coupon made in live mode; the id will differ.

---

## Time was the untested dimension — 2026-08-05

Every billing check so far had walked **states**: an account on trial, an account
active, an account cancelling. All passed. What none of them touched was
**time** — a trial running out, a cancellation arriving at the period end, a
renewal failing. Reading the code explained why: nothing triggers any of the
three.

### A founding member's trial never ended

`Organization.isTrailing` is cleared in exactly two places: Stripe's
`customer.subscription.updated`, and the "End free trial" button. A founding
member has **no Stripe subscription** — their entitlement is a local row — so no
webhook is ever coming, and there is nothing scheduled anywhere in this codebase
to notice (the orchestrator has no trial-related line at all).

So somebody who bought the founding-member deal and never pressed the button
stayed on trial **forever**: X locked, trial banner up, `is-trial-finished`
answering false a year later.

`trialWindow()` now derives the end from the registration date, exactly as
`lifetimeWindow()` derives the 24-hour offer. No column, no cron. It is read in
**one** place — `auth.middleware.ts`, where `req.org` is assembled — so the X
lock, trial-only video, the trial banner and `/billing/is-trial-finished` all get
the same answer without being patched one at a time. The middleware only reads;
the row still records that a trial *started*, and the window says whether it is
still running.

Walked with `dev-state.mjs --created-days-ago`:

| day | `isTrailing` | `/integrations/social/x` | `is-trial-finished` |
|---|---|---|---|
| 1 | true | **406** locked | false |
| 6 | true | **406** locked | false |
| 8 | **false** | **200** | **true** |

**On this database it moved four organizations of five.** Three have no
subscription at all, so nothing they see changes; the fourth is the main account,
which was registered on 17 July and had been sitting in a trial that should have
ended on the 24th. In production the same rule applies to anyone whose
`isTrailing` was never cleared — for paying customers the webhook already did it,
so the ones this reaches are the ones it was written for.

### Buying the lifetime deal used to end the trial on the spot

`grantLifetimeFromPayment` and `lifetimeDeal` both passed a hardcoded `false`
for the trial flag, and the repository writes that straight onto the
organization. The owner's rule is the opposite: buying it leaves the trial
running, and the person becomes a founding member when it expires — or sooner,
from the "End free trial" button the X panel and Billing both offer. Both call
sites now ask `stillTrialing()` instead.

### A failed renewal was invisible

`invoice.payment_failed` had no case in `stripe.controller.ts`. A customer whose
card stopped working saw **nothing** until Stripe gave up retrying weeks later
and cancelled the subscription — at which point the app dropped to the paywall
with no explanation.

It is handled now: an in-app notification, and an amber strip on Billing with
**Update payment method** wired to the Stripe portal. Deliberately it does not
touch the subscription — Stripe retries on its own schedule and most second
attempts succeed; cancelling here would take the plan away from somebody whose
bank merely asked for a confirmation.

One trap worth writing down: the route's `isOurs` filter reads
`metadata.service`, and an **invoice carries none** — that lives on the
subscription it bills. `invoice.payment_succeeded` was already exempted for
exactly this reason; without adding `payment_failed` beside it the event is
dropped before the switch ever sees it.

### The checkout's five differences — all closed

Measured on the rebuilt screen rather than described:

```
[data-checkout-label]   1     "postqueen │ Checkout" in the header
hero                          "Your first 7 days are free"
                              + "Add a card to unlock every channel…"
[data-yearly-switch]          "Switch to yearly and get 5 months free — Switch"
[data-trial-credit]           "7-day free trial   -$20.00"
Help menu               1     the app's own, not a second one
```

Plus the logout confirmation the design asks for on this screen specifically —
*"Your checkout is not finished — the plan you picked will not be saved."*
`LogoutComponent` took an optional message rather than learning about checkout.

The strip says the exact figure for the selected plan (**5** months on CREATOR,
4 on the others) where the toggle badge says "up to".

### Drag and drop: half of it is now proven

The claim was one sentence — "drag and drop is unverified" — covering two
separate things. Split:

- **The endpoint the drop calls works.** `PUT /posts/:id/date` → 200, and
  `publishDate` moved from `2026-08-05T02:00:00Z` to `2026-08-06T02:00:00Z` in
  the database. Thirty seconds to run, and it had never been run.
- **Whether the gesture reaches it is still unknown.** react-dnd's HTML5 backend
  over CDP remains unproven, and that is still written as *not seen* rather than
  broken.

### Baseline

`i18n 1084 → 1092`: eleven added for the checkout and the payment-failure strip,
three removed with the old hero (`billing_grow_your`,
`billing_social_presence_highlight`, `billing_with_postqueen_line`). `api`,
`routes`, `gates` and both type checks unchanged; sweep clean.

### Stripe test clocks — and the bug that only time could find

The three time-based paths were finally run, not reasoned about. Stripe's **test
clocks** let a customer, its subscription and its invoices live on a clock this
repo can advance; every webhook emitted along the way is real.
`stripe-test-drive.mjs --clock` starts one, `--advance N` moves it, and
`--drop-clock` deletes it with everything on it.

| advanced | Stripe emitted | result here |
|---|---|---|
| **8 days** | `trial_will_end`, `customer.subscription.updated` | trialing → **active**, `isTrailing` false |
| **35 days** after cancelling | `updated`, `customer.subscription.deleted` | local row **gone**, paywall |
| **32 days** with a refusing card | two `updated`, two `invoice.payment_failed` | subscription **past_due** |

**A failed renewal put the customer back on trial.** `createSubscription` and
`updateSubscription` both passed `status !== 'active'` as the organization's
trial flag. That is true of `past_due`, `unpaid`, `incomplete` and `paused` as
well as `trialing` — so the moment a card was refused, a customer who had been
paying for a month was written into a **trial they were not on**: X re-locked,
trial banner up, trial-only video limits applied. Only one status is a trial, and
that is what it reads now.

Nothing but moving the clock could have found this. It is the fourth defect this
session that was invisible in the source and obvious the moment something real
happened.

**The replay filter was also missing the invoice events.** An invoice points at
its subscription through `parent.subscription_details.subscription`, not
`invoice.subscription`, so both `payment_succeeded` and `payment_failed` had been
filtered out of every replay — which is why the first failed renewal looked like
it emitted nothing but subscription updates. Fixed, and the handler then answered
201 twice as Stripe retried.

`payment_failed` was the last of doc 03's ten states with nothing behind it. All
ten have now been reached: the amber strip renders, the in-app notification
lands, and `Update payment method` opens the Stripe portal.

### Plugs, with a channel that supports them

The empty state was all this migration had seen, because the only channel was
Mastodon. With a Bluesky placeholder — one of the four providers in the design's
`plugSupported` — the page renders exactly the two the prototype's `PLUGS` array
defines: **Auto Repost Posts** and **Auto plug post**. Analytics still shows its
empty state, correctly: Bluesky is not in the design's `ANALYTICS` map either.

The placeholder was removed afterwards. To see it again:

```
node -e "…prisma.integration.create({ providerIdentifier: 'bluesky', … })"
```

or seed any of `x`, `linkedin-page`, `threads`, `bluesky`.

### Not done, and named

Doc 03's test matrix asks for its 14 combinations photographed in both themes as
a regression fixture. **All ten states have now been reached and measured**, but
the 28 screenshots were not taken and no Playwright fixture was wired. That is
documentation of what already passes, not verification of something unknown —
which is why it is last, and why it is written down rather than quietly dropped.

### The Settings tabs, exercised rather than looked at

Every tab had been *rendered* during this migration. None had been **used** —
nothing was ever created, listed and deleted through one. On GROWTH, so all
eleven exist at once:

| tab | create | listed | delete |
|---|---|---|---|
| Webhooks | 201 | `Webhooks (1/10)` with the row | 200 |
| Auto Post | 201 | title, URL, Active | 200 |
| Sets | 201 | `Sets (1)` with the row | 200 |
| Signatures | 201 | content, Auto Add? = Yes | 200 |

The webhook URL guard was worth the trip on its own: `http://localhost:3000/x`
is refused with **400** and both messages — *"url must be a URL address"* and
*"Webhook URL must be a public HTTPS URL and cannot point to internal network
addresses"*. The same validator protects the autopost URL.

**One defect, in the signatures list.** The content column read
`p.content.slice(0, 15) + '...'` — of the **raw HTML**. A signature stored as
`<p>— Sent with PostQueen</p>` listed itself as `<p>— Sent with ...`: a markup
tag shown to the person who wrote the text, with a cut that could land inside a
tag, and an ellipsis appended whether or not anything was actually cut. The
delete confirmation named it the same way.

Both now use `stripHtmlValidation` — the helper the calendar card already uses
for exactly this job — and the list reads `— Sent with PostQueen`.

Everything created for this was deleted afterwards, which exercised the four
delete paths as well.

---

## The fidelity pass — 2026-08-05

The owner put the app next to the prototype and said it does not look like the design — naming
the sidebar, Settings, Posts, Billing and AI Copilot. They were right, and the reason is worth
writing down: everything this log verified so far was measured — dimensions, counts, states —
and almost nothing was *read side by side*. Three screens were audited against the prototype's
own markup line by line and produced **~200 concrete visual deltas**: billing + checkout 87,
settings 78, AI Copilot 35. The full lists live in `docs/ui-fidelity-audit/` and are the
checklists this pass works through. The AI Copilot finding is the bluntest: its desktop surface
was entirely legacy tokens or CopilotKit defaults — the grey SDK input pill, a white user
bubble — with `pq*` tokens appearing only in the mobile drawers.

**Two standing rules changed, by the owner, this session:**

1. **The rail matches the design's inventory exactly.** "Never delete a capability the design
   does not draw" had accumulated three extra rows. Connections' row is gone — the rail's own
   primary button opens the same place. Plugs and Affiliate left the rail and became link rows
   in the Settings sub-nav, same gates, same targets; `Title` still names their pages.
2. **Visible labels and headings come from the design**, as translation keys with English
   fallbacks — "Social Sets", not "Sets". Error/validation strings stay the repo's.

### Primitives — done

The design's toggle replaces the 57×34 knob (`slider.tsx`): 40×22 on `--brand`/`--border`,
16px white knob, the prototype's own 3→23px travel. Button's `danger` variant moves off
`bg-red-500` onto the warn token, and its spinner follows `currentColor` instead of being
white on every variant. `--ltCardOn`/`--ltCardOff` gained the Tailwind aliases they never had.
And `bg-newBgColorInnerInner` — a class that resolves to nothing — was painting no background
under the API-key, CLI and MCP cards; they sit on `--pop` now. That one was a live visual bug
on the Developers tab, found by the audit, not by any check.

### The rail — done

Order is the design's: Calendar, Posts, **AI Copilot, Channels** (ours had them swapped),
Analytics, Media; More holds exactly Social Sets, Signatures, Auto Post, Webhooks,
Integrations. Verified by reading the rendered rows back with `--eval`, not by eye: sixteen
rows, in the design's order, with the org switcher and Settings in the footer where they
belong. The Upgrade row is absent because this account is lifetime, which is the gate working.

**Checks:** types 0 · api 149 · routes 28 · gates 14 unchanged. **i18n 1092 → 1093** —
`social_sets`, the design's label. The `sets` key stays for its other call sites until the
Settings tab takes the new label in the next step.

### Settings, tab by tab — done

The shell landed first (`dbe77cd7`); this step is everything inside it. All twelve tab surfaces
now speak the design's card language — `--pop` on an inset hairline ring at radius 10, 13.5/600
section labels, 12.5 muted sub-lines — and the pseudo-table grids (Webhooks, Autopost, Social
Sets, Signatures) became the design's hairline list cards with 30px icon tiles, JetBrains Mono
URLs and 28px icon-only edit/delete buttons whose delete hover is the warn token. Teams gained
the design's row anatomy: 30px avatar, name over the actual e-mail, a role pill, and an
invisible-not-absent remove button for rows the caller may not remove. Date Metrics and
Shortlink swapped native `<select>`s for the design's inline chips — same values, same
handlers. Language became the 44px horizontal tile row (and dropped this tree's last Mantine
import); its new header hides inside the top-bar flag modal, which already has a title.

**Connections became the page the design says it is.** `/connections` (routes 28 → 29), reached
from the rail's own primary button; `?tab=connections` redirects; the tour's two steps follow it
and their anchors moved with them. The Developers tab shrank to the design's two cards — API key
(masked as text, not a CSS blur) and "Connect an AI agent" — while its CLI and MCP sections were
deleted outright: the Connections directory documents every one of those clients with real
per-client steps, which is exactly why the design keeps a page for it. Docs and the payload
wizard stay as quiet neutral buttons; the N8N link's job is done by the n8n connector pane.

**One gate almost lapsed, and the counter caught it.** Moving the tab deleted its
`tier.public_api` condition and the new page had none — for a moment, Connections would have
rendered for any member on any plan. `gates` went red (`tier.public_api 3 → 2`), and the page
now carries the tab's exact gate with a quiet refusal for everyone else. This is the same
failure shape as step 7a's team-member gate, stopped by the check that step created.

**Checks:** types 0 · api 149 unchanged · **routes 28 → 29** (`/connections`) · gates 14
unchanged. **i18n 1093 → moved in both directions**, all accounted for: the additions are the
design's labels and descriptions (`social_sets` copy, `date_metrics` chips, `invite_member`,
`developers_description`, `connect_an_ai_agent*`, `open_connections`, `connections_admin_only`,
`search_settings`); the removals are the deleted Developers sections' own keys (`mcp_client*`,
`cli_*`, `api_auth_note_line1-4`, `n8n_node`), the dropped pseudo-table headers (`title`, `url`,
`active`, `content`), and labels the design renamed (`add_another_member` → `invite_member`,
`remove`). Nothing was removed that a surviving surface still says.

### Billing and the checkout take the design — done

The 87-delta checklist in `docs/ui-fidelity-audit/billing.md` is worked through. The page is the
design's 1080px rail: 26px display "Plans", the segmented period pill with a live "{n} months
free" figure, the plan-meta line, and a real CSS grid of radius-16 cards — current-plan brand
ring, AGENCY's gradient composed from tokens via color-mix, MOST POPULAR on PRO, 29px display
prices, colour-coded prorate above the CTA, brand tick tiles, `pqunlim` on "Unlimited channels".
The strips arrived with it: trial banner wired to the existing FinishTrial state, the lifetime
upsell gated on the same `lifetimeWindow()` the backend enforces with a 410, payment-failed in
the warn family, cancel-notice with its in-banner Reactivate. Portal/cancel became the design's
card row; the FAQ got its heading back and the rotating tinted chevron, plus a `scale` prop so
the checkout draws the same FAQ one size up.

**The lifetime redirect is gone — deliberately.** Doc 03's fourth lifetime rule sent founding
members away from `/billing`; the prototype's own billing page has a lifetime variant, and the
prototype outranks the docs. A founding member now sees the amber hero (with MEMBER SINCE read
from `subscription.createdAt`), the facts row, and the Current/Next package cards shared with
`/billing/lifetime` instead of being bounced. `gates` recorded the change honestly:
`user.isLifetime` 9 → 18, every move additive.

The checkout followed its own half of the list: h68 sticky header with the "Checkout" label, the
54px/800 hero on `--brand` (pqPink retired), the lifetime card with the real countdown and an
"OR SUBSCRIBE" divider, the plan picker in its radius-22 card with radio dots and per-plan
months-free, the order summary moved to the right column through a portal slot (it must stay
inside CheckoutProvider), the h56 shadowed Pay button on a flat h92 bar. Stripe's Appearance
literals now mirror named tokens, commented.

**A platform finding that had been silently eating styles:** Tailwind alpha modifiers on
`var()`-backed colors (`bg-pqWarn/15`, `outline-pqOk/25`) generate **no CSS at all** — verified
by compiling. Six such classes existed from earlier steps and none had ever rendered; all are
replaced with real tokens or color-mix arbitraries, and the token layer gained the soft/line
pairs the strips needed (`--okLine`, `--warnSoft/Line`, `--ltSoft/Outline`;
`pqLtCardOn/Off` moved to `backgroundImage` where gradients belong).

Deliberate copy honesty over the design's stage dressing, all noted in code: the upsell names
the tier the ladder actually grants, the lifetime footer says "One payment · no renewal" because
the session is `mode:'payment'`, the lapsed strip is dateless because the row is hard-deleted,
and there is no version chip because no real version exists to show.

### The AI Copilot page stops being an unthemed SDK — done

Every `--copilot-kit-*` variable is bound to the token layer, so the grey `#2c2c2c` input pill
and the white user bubble are gone: user messages are brand with the design's 14/14/5/14 corner,
assistant messages are bare 13.5px/1.65 text with a 26px "PQ" tile, and the thread runs in a
centred 840px column. The composer is the design's `--pop` card with the toolbar *inside* it —
ghost buttons, gates untouched, a 32×32 brand send that dims when empty — and the design's
placeholder. The empty state is the hero ("What are we posting today?") with the "Prefer your
own AI tool?" card linking to /connections; the five-paragraph greeting is retired with the
owner's copy decision. The channel column takes the design's selection language (opacity .6,
brandSoft + tick when selected, Add Channel via the same `useAddProvider` hook) and the chats
rail is the design's 232/56px pinned rail. Message regenerate/copy/thumbs stay, as quiet ghosts.

Not built, named: the draft-plan card and the AI-lock overlay (product decisions), the channel
3-dot menu (its component is welded to `useCalendar()`), and the in-composer 58px attachment
thumbnails (shared markup with the post composer).

**Checks after both steps:** types 0 · api 149 · routes 29 · gates 14 (counts moved additively,
recorded above) · **i18n 1137**, adds being the design's billing/agent copy and removals the
retired greeting, "Features"-era labels and never-interpolating variants. One interpolation bug
was caught by the screenshot: the months-free pill rendered a literal `{{n}}` because two call
sites disagreed on the parameter name.

### Posts is the design's list — done

The design has no separate Posts screen: `page:'posts'` renders the calendar's list view beside
the posts panel, and ours now draws it the design's way — day-grouped rows under date headers
with per-day counts, the segmented state filter, brand accent bars, status pills, and a
"Showing N of M" line over the design's Load-more button in place of the old pager. The list
now *accumulates*: pages already read stay on screen under one SWR key with `keepPreviousData`,
because the design's list grows downward instead of swapping pages — same endpoint, same
call surface (`api` unchanged at 149). The panel takes its 300px/248px widths and the 15px
display heading from the prototype. i18n: the pager's `page` label retires; the empty states
split per tab (`no_posts_yet` / `no_drafts_yet` / `nothing_published_yet`), plus `show_more_posts`,
`showing`, `collapse`.

### The sweep, both themes, and RTL — done

Thirteen screens plus the new `/connections` (added to `ui-sweep.sh`), three widths, both themes:
**zero horizontal overflow anywhere**, and the only warnings are the two honest redirects —
`/third-party → /settings` (ours, by design) and `/agents → /agents/new` (the app's own).
`/billing` no longer redirects the lifetime account, which is the deliberate change above doing
its job. The light theme was read, not assumed: the billing grid, the lifetime card and the
settings modal all resolve correctly through the token layer. Hebrew mirrors cleanly — the
settings card flips, the close button crosses to the start edge, and untranslated new keys fall
back to English until the catalogues catch up.

Root `CLAUDE.md`'s two non-negotiables now say what the owner decided during this pass: the rail
matches the design's inventory exactly (capabilities stay *reachable*, not necessarily *drawn*),
and visible labels take the design's text as translation keys.

One honest gap in the list step, recorded after its review agent reported in: the "Showing X of
Y posts" line is composed word-by-word from existing keys, the same way the pager line it
replaced was. That reads correctly in English and will misorder in some of the fourteen
locales; the right fix is a single interpolated key (`showing_x_of_y`, '{{shown}} of {{total}}'),
which is translation work rather than a restyle and is left named here instead of half-done.
The review pass also caught and fixed a real regression before it shipped: leaving the list on
page N made the posts panel fetch N+1 pages after a view switch — `listPage` now resets when the
display mode changes.

### Gap pass — Channels IA, Create Post split, calendar filter (2026-08-05)

Closed against the prototype after the Channels page existed:

- Calendar is queue + grid only (channel column removed; Add / reconnect live on `/channels`).
- Header Create Post is the design's Blank post / AI post split (AI gated like Generator).
- Channels: inline Add pane, All / Connected / Needs attention filters, detail actions (New post
  opens composer, Reconnect, Publishing options, Time slots), and inline Automations (plugs API).
- Calendar toolbar: channel multi-select filter (`chanFilter`) applied client-side to grid + panel.
- List foot uses `showing_x_of_y`.
- Mobile: posts panel auto-collapses and opens as an overlay drawer so the grid keeps width.

Still intentional / named elsewhere: lifetime scarcity counter, AI Copilot draft-plan /
AI-lock, `ended` dated strip, 14-case photo fixture.

### Settings inventory — design-exact (2026-08-05)

Supersedes the fidelity-pass note that kept Plugs and Affiliate as Settings `extraMenu`
link rows. The prototype Settings nav has neither; plugs UX is Channels → **Automations**
(`chPlugs`), with the dedicated page titled **Auto-Plugs**. Affiliate keeps the same
URL/billing/role gates in the **user menu**. Settings More no longer navigates to `/plugs`.
`pageOnlyMenu` still names `/plugs` for `Title`. Channels Automations links “Open Auto-Plugs”.

**Checks (`scripts/ui-migration-check.sh --update`):** types 0. **routes 29** unchanged.
**api** moved with the Channels/calendar IA: removed calendar-only
`/integrations/${id}/group` and the old refresh template; added Channels detail
`/posts/find-slot/${current.id}`, `/integrations/social/${current.identifier}`,
and inline plugs `/integrations/${integration.id}/plugs` +
`/integrations/plugs/${data.id}/activate` (same endpoints `/plugs` already used —
now also referenced from the Channels page). **i18n** adds design labels
(`blank_post`, `ai_post`, filter keys, `showing_x_of_y`, reconnect copy, …) and
drops the word-composed `showing` / `of` list foot. **gates:** `billingEnabled` and
`tier.ai` rose because Create Post's AI menu shares the Generator gate; calendar
column lifetime chip removal dropped `user.isLifetime` / `tier.current` by one each.

### Batch D spot — calendar/channels token polish

Spot check after the gap pass (no calendar channel column restored):

- Confirmed `channel.automations.tsx` already has the **Automations** header and
  **Open Auto-Plugs** → `/plugs` link from Phase 1.
- `channels.component.tsx` has no leftover Links to `/plugs` labeled “Plugs” or
  “Automations” that bypass the Channels detail Automations block.
- `channels/*.tsx` had no leftover `newBg*` / `bg-sixth` classes.
- Token renames only (alias → `pq*`) in eight calendar-path `launches` files:
  `launches.component.tsx`, `calendar.tsx`, `menu/menu.tsx`, `time.table.tsx`,
  `add.provider.component.tsx`, `helpers/top.title.component.tsx`,
  `select.customer.tsx`, `comments/comment.component.tsx`
  (`bg-newBgColorInner` → `bg-pqInner`, `bg-newBgColor` / track → `bg-pqBg` /
  `scrollbar-track-pqBg`, `border-newBgLineColor` → `border-pqLine`,
  `bg-sixth` → `bg-pqTableHeader`).

### Full design fidelity campaign (2026-08-05)

Master inventory: [`docs/ui-fidelity-audit/MASTER.md`](docs/ui-fidelity-audit/MASTER.md).

| Phase | What shipped |
| --- | --- |
| Settings inventory | Plugs/Affiliate out of Settings; Affiliate → user menu; Auto-Plugs title; Channels Automations + Open Auto-Plugs; FREE nested settings modal removed |
| Shell / Settings | Scrim card 1040×680, nav 236, shared tab title/desc; Language/Teams/Plan cards polish; Integrations embed = card grid |
| AI Copilot | 58×58 attachment thumbs; channel 3-dot via Menu prop overrides. **Raise:** draft-plan card, AI-lock overlay |
| Tokens | Legacy `bg-sixth` / `newBg*` / auth / form primitives → `pq*` |
| Billing docs | [`billing-photo-fixture.md`](docs/ui-fidelity-audit/billing-photo-fixture.md) — 14×2 @ 1440. Raise: CREATOR $132, months-free copy. Intentional: scarcity counter |
| Composer docs | [`composer.md`](docs/ui-fidelity-audit/composer.md) + token renames in manage.modal/editor; screenshot verify still owed |

**Still Delta / Raise (not silently “fixed”):** Settings per-tab nits (Developers pills, Sets table header, Integrations connected-state), composer screenshot matrix, billing photo capture, AI draft-plan/AI-lock product hooks, Milestone 10.

**Checks (`scripts/ui-migration-check.sh --update`):** types 0. **routes 29** unchanged. **api 152**, **i18n 1165**, **gates 14** baselines rewritten for this tip (Plugs Settings rows gone; `auto_plugs` / `open_auto_plugs` / `plan_invoices_description` and agent/media keys among the delta; Settings pane title uses existing `auto_post` so orphan `autopost` key dropped).

### Screenshot-driven fidelity fixes (2026-08-05)

Against owner screenshots of the prototype:

1. **Rail pin/hover** — Visible **Pin sidebar / Unpin sidebar** (not Collapse). Removed
   `data-sb-toggle` opacity hide so the pin row stays painted. Collapsed resting uses 34px
   centered Connect/nav squares; hover expands with `!important` label reveal. Org name kept
   in DOM via `data-sbl` for hover. Connect `h-36` / `mt-12`.
2. **User menu** — **Billing & invoices**, **Sign out** (confirm dialog kept as WORK).
3. **Trial lock** — Shared `trial-lock-card.tsx` for X Add-channel + AI Copilot overlay when
   `user.isTrailing` (supersedes prior AI-lock Raise). Secondary CTA → `/billing`. No invented
   trial-end date.
4. **Channels detail** — Automations **Set up plug** / **Off**; platform options accordion
   (`chOpts`); avatar r15 + platform badge.
5. **Integrations** — Content pane is grid-only; Settings tab rail is intentional (design).

**Checks:** types 0; routes 29; api 152; **i18n 1178**; gates 14.

### Product tour = design first-run (2026-08-05)

- Removed the old fullscreen onboarding modal; register/activate → `?tour=true`
  starts the design tour only (`layout.context` + `Tour`).
- Steps match `tourSteps()`: cal-grid → posts-panel → connect-pq (rail) →
  connections-page (dim + card glow) → nav-channels (rail) → platform-grid
  (Add Channel open). Finish lands on `/channels?add=1`.
- Demo posts fill calendar **and** Posts queue for the whole tour on empty accounts;
  Posts panel forced open on calendar steps.
- Help “Setup tour” replays the same tour (duplicate Replay row removed).

### Settings card size + nav inventory (2026-08-05)

Owner screenshots: Settings looked tiny and resized per tab; Workspace showed
**Plan & invoices** though the prototype's `settingsTabs` is only Global Settings /
Language / Teams (+ More / Developers).

- Root cause of shrink: a shrink-wrap wrapper around `SettingsPopup` made
  `w-[min(1040px,100%)]` resolve to content width. Card is now a direct scrim
  child with fixed `min(1040×680, 100%)` (prototype); `stopPropagation` on the card.
- Removed Plan & invoices from Settings nav. Billing stays on `/billing` and user
  menu **Billing & invoices**. Deep link `?tab=plan_invoices` → `/billing`.

**Checks (`scripts/ui-migration-check.sh --update`):** types 0; routes 29; api 152.
**i18n** drops `plan_invoices` / `plan_invoices_description` (Settings tab header only;
component file kept but unmounted — `/billing` is the design surface). **gates**
`billingEnabled` count falls with the Settings Workspace row gone.

### Posts rail + list fidelity (2026-08-05)

- **Posts click:** sync `searchParams.display` → calendar filters (rail Link no longer
  a no-op while already on `/launches`). Calendar rail uses `?display=week`.
- **Active / title:** MenuItem + Title read `display=list` → Posts /
  “Everything scheduled, drafted and published”.
- **List toolbar:** date-range chip (All dates / Today / week / next3 / past /
  day chip) + Oldest/Newest; status segment removed from list (queue-only).
- **See all N posts** / week day header → `openPostsForDay` → list + `listDay`.
- **Queue panel** hidden when `display=list`.
- **UI demo fixture** (`ui-demo-posts.ts`): design seed rows when the account is
  empty in development (or `?uiDemo=1`). Soft method pills on list cards.

### Modal / popup fidelity (2026-08-05)

Owner complaint: Add API key (Settings → Integrations) missing **Cancel** and **X**;
popups looked legacy. Plan + inventory: [`docs/ui-fidelity-audit/modals.md`](docs/ui-fidelity-audit/modals.md).

- **Shared shell** (`new-modal.tsx`): card `bg-pqInner` (design `--inner`), gap 16,
  title clearance for X; exported `ModalFormActions` (primary + outline Cancel);
  `DecisionModal` matches confirm footer (brand/danger + `btnSimple` Cancel);
  `deleteDialog` → danger primary.
- **Add API key** (`third-party.list.component.tsx`): X on, size 420, **Add Integration**
  + **Cancel**, design labels via `t()`.
- **Settings forms** with Cancel footers: webhooks, teams, signatures, autopost
  (handlers unchanged). Removed leftover Mantine close inside signature form.
- **Still Delta:** Media/composer/billing/channel form bodies (sibling ownership);
  Connected “Update key” CTA on Integrations cards (Settings Delta / Raise).

**Open locally:** Settings → Integrations → click a provider card (e.g. Reel.Farm).

**Checks (`scripts/ui-migration-check.sh`):** types 0 (fe+be); routes 29; api 152; gates 14
unchanged. **i18n FAIL** from sibling Media keys already in the tree (`upload_media`,
`change_alt_text`, `showing_x_of_y_files`, …) — not introduced by this modal pass; title
reuses existing `top_title_add_api_key_for`. **Did not `--update`.**

**Checks (`scripts/ui-migration-check.sh --update`):** types 0; routes 29; api 152.
**i18n** adds Posts list labels (`all_dates`, `see_all_n_posts`, `subtitle_posts`,
sort keys, …); drops in-cell `show_more` / `show_less`. **gates** tip drift from
billing/trial copy elsewhere on the branch.

### Channels centering + reconnect fidelity (2026-08-05)

Owner: detail / add / invite were full-bleed; disconnected Reddit detail looked
unbuilt. Audit: [`docs/ui-fidelity-audit/channels-reconnect.md`](ui-fidelity-audit/channels-reconnect.md).

**Layout (prototype `:1720` / `:1861` / `:1774`):**
- Add + detail panes: `max-width:760px; margin:0 auto` inside pad `20/24/40`.
- Connect / invite step: `max-width:460px` (`ProviderSetupStep`).
- Platform grid: 4 columns, gap 12, tile h104 r12 inset ring (was 5-col stretch).

**Reconnect LOOK (WORK unchanged — existing OAuth refresh URL):**
- List: warn truncated *"Channel disconnected, click to reconnect"*; red `!`.
- Detail: avatar opacity .5; clickable disconnect meta; pill **"Needs reconnect"**
  (`bg-pqAmberSoft` / `text-pqWarn`); action Reconnect; amber lost-connection banner.
- **Channel / Access** settings groups (`chDetailGroups`) wired to Menu APIs
  (time slots modal, group, copy ID, credentials/reconnect, disable, delete).
- Time slots: action + group open TimeTable **modal** (design sheet); inline
  full-width card removed so width matches centered column.

**Raises:** Custom URL row only when `customFields` (design always lists it);
prototype reconnect toasts, repo redirects OAuth.

**Checks (`scripts/ui-migration-check.sh --update`):** channels files clean.
Frontend `tsc` FAIL is **sibling Media** (`MediaBox` missing in
`media.component.tsx`) — not Channels. Backend types 0; **routes 29**; **api 152**;
**i18n** baseline rewritten (~1208, reconnect / Channel–Access keys); **gates 14**.

### Billing / trial / lifetime LOOK fidelity (2026-08-05)

Owner complaint: End free trial + lifetime screens did not match the handoff. Side-by-side
against `finishTrialOpen` (~3090–3141) and billing lifetime / upsell markup (~2302–2507).

**What was wrong**
- `FinishTrial` was a left-aligned "Your trial is over" / Done card — not the design's
  centred 440px `--pop` sheet (spinner pending → check/crown success, charged/renews box,
  Back to billing + Close).
- `/billing/lifetime` had no Plans-column chrome (padding / 1080 max-width) and the purchase
  offer was a purple brandSoft countdown bar, not the amber founding upsell card.
- Rail Upgrade hid lifetime users and ignored AGENCY / founding variants (heart + Founding
  member, card + Billing & invoices). User-menu filter still dropped Billing for lifetime.

**Fixed (LOOK only; Stripe/finish-trial POST unchanged)**
- `finish.trial.tsx` — prototype sheet; charged amount from tier / `LIFETIME_PRICE`; renew
  date not invented (Never / Active).
- `lifetime/page.tsx` + `lifetime.deal.tsx` — shell + amber purchase card + countdown.
- `main.billing.component.tsx` — upsell gradient 110deg; passes charged/period into FinishTrial.
- `rail.tsx`, `top.menu.tsx`, `user.menu.tsx` — design Upgrade / Lifetime deal labels.

**Raises (unchanged / named)**
- Trial-end / renew calendar dates still live in Stripe — banners stay dateless.
- CREATOR yearly $132 and months-free vs coupon honesty (product).
- Lifetime scarcity "N of 200" chip — intentional skip.
- Design confirm dialog `billingDlg: finishTrial` before charge is unused by the prototype's
  own banner CTA (`openFinishTrial` goes straight to the sheet) — matched that path.

**Checks:** `scripts/ui-migration-check.sh` → types 0 · api 152 · routes 29 · gates 14.
i18n at tip shows a concurrent sibling rename (`add_api_key_for` → `top_title_add_api_key_for`)
unrelated to billing — not `--update`'d here. Billing keys themselves are stable.

**Verify locally:** grant a trialing org (`isTrailing`) → /billing → End free trial sheet;
`scripts/grant-lifetime.mjs` for founding hero; FREE + open `lifetimeWindow` → /billing/lifetime.


### Media page fidelity (2026-08-05)

Owner screenshots: empty-state centered with filters at the **bottom**; no top
toolbar, search, dashed drop zone, or “ALL FILES N” card grid. Prototype
`isMedia` block (~2144–2254) + lightbox (~2570) + library sheet (~3226) win on LOOK.

**What changed (LOOK; upload/SWR/delete handlers kept)**
- `/media` toolbar **top**: All / Images / Video · search “Search by file name” ·
  grid/list icons · brand Upload (up-arrow).
- Dashed brand drop zone: “Drop files here, paste or browse” / 1 GB copy.
- Section label `All files` + count; 4:3 cards (filename + meta); video duration
  badge; ⋯ menu (Preview / Download / Change alt text / Delete).
- Click → design lightbox (image + controllable video). Drag overlay matches
  brandFaint; paste wired to the same Uppy enqueue path as drop/browse.
- Create Post **Insert media** picker: search + Upload, 6-col select grid,
  Cancel / Add selected media (44px) — design `libraryOpen`.
- **UI demo fixtures** (`ui-demo-media.ts`): prototype `MEDIA` seed (v32-hero.png,
  demo-60s.mp4, …) when the library is empty and UI demo is on (dev default or
  `?uiDemo=1` / `localStorage pq-ui-demo`). Not persisted; not insertable into
  real posts.

**Raises**
- **Rename** appears in the design media menu; there is no rename API — omitted
  from the menu (not invented).
- **Pixel dimensions** (`PNG · 1600×1600`) are not on `Media`; real rows show
  `EXT · size` when `fileSize` is known. Demo rows keep the prototype meta.
- Design **Upload** sheet (`uploaderOpen`) is not a separate modal on `/media` —
  browse/drop/paste go straight to the existing Uppy uploader (same capability).
- Demo video enlarge uses a public MDN CC0 sample URL (not uploaded).

**Checks:** types (frontend/backend) 0; api 152; routes 29; gates 14.
i18n: Media keys already in baseline; tip still fails on concurrent sibling
rename `add_api_key_for` → `top_title_add_api_key_for` (modals fidelity) — not
`--update`'d here.

**See dummy media:** empty library + frontend in development, or `/media?uiDemo=1`.
Disable with `?uiDemo=0`.


## Parallel fidelity wave baseline (2026-08-05)

Baseline rewrite via `scripts/ui-migration-check.sh --update` after parallel UI fidelity agents (Posts, Media, Billing, Channels reconnect, Modals). Types, API paths, routes, and gates unchanged. i18n delta was intentional key rename/additions from the fidelity wave (notably `add_api_key_for` → `top_title_add_api_key_for`; other Posts/Media/Billing/Channels copy keys already aligned or captured in this rewrite).

### Calendar card actions + multi-post overflow (2026-08-05)

Owner: calendar cards clipped when stacked; Edit missing; queue had no actions;
hover-only clusters unreachable on touch.

**Week overflow (prototype `gridVals`):** if N>2 show **one** card + **See all N posts**
→ `openPostsForDay`; if N=2 show both with `line-clamp-1`. Week no longer uses
`data-stack` hover-scroll. Month: up to 3 + **+N more**.

**Actions:** Calendar/list clusters add **Edit** (hidden when Published); week/day
omit Statistics (list keeps it). Queue: click-to-edit + Edit / Duplicate / Delete.
`data-ci` + mobile / `hover:none` force `[data-ci-actions]` visible (`global.scss`).
Client demo posts (`pq-ui-demo-*` / `pq-tour-demo-*`) block API actions with a
warning toast + demo tooltip (same idea as demo media read-only) — not a silent
no-op. Real posts still use `usePostActions` (edit / duplicate / preview /
delete) on calendar, list, and queue.

**Raises unchanged:** `groupCell` multi-channel merge; month 24px chips restyle.

**Checks (`--update`):** types 0; api 152; routes 29; gates 14; i18n adds
`edit_post`, `n_more`.

### Modal / Create Post / Calendar close + billing contrast (2026-08-05)

Continuation pass after prior agents left a dirty tree. Audits:
[`docs/ui-fidelity-audit/modals.md`](docs/ui-fidelity-audit/modals.md),
[`docs/ui-fidelity-audit/create-post-copilot.md`](docs/ui-fidelity-audit/create-post-copilot.md).

**A — Modals:** Signature/autopost/plug CopilotTextarea field chrome (`--tableHeader`);
removed API-key `size: 420`; PlugPop + Channels Automations get X + `ModalFormActions`.
**B — Create Post / Copilot:** Select channels + `none yet` / N selected; Let AI write
banner → `/connections` (Raise: no Claude/ChatGPT product write path); Copilot
`none yet` + Posting to pills.
**C — Calendar:** past slot hover `Date passed` via `[data-cell-past-label]` + i18n
(owner override; replaces dead `.col-calendar` CSS).
**D — Close-confirm:** Scheduled Times / TimeTable no longer ask; Create Post keeps
confirm; close discards dirty slot state on unmount.
**E — Autoplug:** Recommend stay per-channel on Channels Automations + modal edit
(already aligned); no inline rewrite.
**F — Billing:** plan titles + Monthly/Yearly inactive use `text-pqText` (light contrast).

### Rail footer pin + Media lightbox (2026-08-05)

Owner: Settings / Upgrade rode page scroll; Media click opened a sparse lightbox with
an empty / glyph stage instead of the demo or real preview.

**Rail:** chrome row `items-stretch`; only `[data-sb-scroll]` scrolls; `[data-sb-foot]`
is `mt-auto shrink-0` (org / Settings / Upgrade). Mobile drawer already viewport-fixed.

**Media:** Lightbox stage always has pixels — gradient underlay + data-URI still /
sample video; grid demo thumbs use the same gradient underlay. Download / Delete /
Close kept; **Rename** still Raise (no API).

Fidelity: [`docs/ui-fidelity-audit/rail-pin-media-lightbox.md`](docs/ui-fidelity-audit/rail-pin-media-lightbox.md).

**Checks:** `ui-migration-check` PASS (types 0/0, api 152, i18n 1217, routes 29, gates 14).

### Rail menus vanished + hover bleed (2026-08-05)

Owner: main/more nav missing (Connect / Settings / Upgrade only); collapsed
hover-expand let Posts “Next 3 days” paint through “Pin sidebar”.

**Cause:** (1) `DesktopSlot` `h-full` on an abspos-only flex item resolved the
slot/nav to 0 height — `[data-sb-scroll]` (`flex-1` + `overflow-y-auto`) clipped
menus while shrink-0 chrome still painted. (2) `z-45` on the nav alone could not
beat the next flex sibling; page toolbars stacked over the expanded rail.

**Fix:** slot = `self-stretch` + `z-[45]` (no `h-full`); nav height from
`inset-y-0`; page column `relative z-0` to trap stickies/toolbars; hover CSS keeps
width/shadow only. Footer pin intent unchanged.

### Connections chrome — owner overrides (2026-08-05)

- **No Reveal key** on `/connections` header (security). Key stays masked in
  snippets; manage/reveal remains Settings → Developers / Public API only.
- **No FLOW badge** on the n8n Automation card (noise). Zapier/Make still show
  SOON.

### Calendar past-slot "Date passed" (2026-08-05)

Owner: hovering a past week cell with posts painted `Date passed` across the
card face and See all chip (broken stacking).

**Fix:** `[data-cell-past-label]` only mounts when the cell is past **and empty**
(`postList.length === 0`); CSS hover mirrors that with
`[data-past='1']:not([data-filled='1'])`. Cards keep `z-[2]` + actions; See all
gets `cursor-pointer` so it does not inherit the cell's `cursor-not-allowed`.
Same `CalendarColumn` path covers week / day / month.

### Cancel subscription retention flow (2026-08-05)

Owner: cancel showed a plain `deleteDialog` (“No, cancel!”) and often skipped the
50% offer; design is confirm → Before you cancel → feedback.

**LOOK:** `BillingCancelDialog` (`data-pq="billing-cancel-dlg"`) matches prototype
`billingDlg` chrome — icon chip, amber team-removal note on confirm, Keep my plan /
Yes cancel, then Apply 50% / Cancel my subscription, then feedback + 20-char hint.

**WORK:** Same APIs (`GET /billing/check-discount`, `POST /billing/apply-discount`,
`POST /billing/cancel`). Discount step only when `offerCoupon` and **not** lifetime
trial (`isLifetime && isTrailing`). Prefetch check before confirm.

**Raises:** Design lifetime-trial $24.50 retention not implemented (owner skip).
Yearly / no charge / missing `STRIPE_DISCOUNT_ID` still skip coupon (backend).

**Checks (`--update`):** intentional i18n keys for cancel dialog copy
(`before_you_cancel`, `keep_my_plan`, `apply_50_discount_3_months`, etc.).

### Posts list actions looked dead on demo rows (2026-08-05)

Owner screenshot (list, Wed Aug 5, 4 Scheduled): hover showed Edit / Duplicate /
Preview / Delete but clicks did nothing.

**Verdict: dummy, not a real-post wiring bug.** Rows were `pq-ui-demo-*` seeds
(empty calendar + UI demo on). Handlers were already wired to `usePostActions`;
demo IDs silently returned + `disabled` buttons with “Edit” tooltips.

**Fix:** `useDemoPostAction` toast + demo tooltip (media read-only pattern) on
calendar / list / queue. Real posts unchanged — Edit → compose, Duplicate →
clone compose, Preview → `/p/{id}?share=true`, Delete → confirm + DELETE.

### Popovers overflow viewport right edge (2026-08-05)

Owner: Posts list **All channels** panel clipped off the right (search + Select
all truncated). Same class of bug on other absolute menus near the trailing edge.

**Root cause:** panels used `absolute start-0` (or unclamped `fixed` left) with a
fixed width; no flip/shift against the viewport. Not parent `overflow:hidden`.

**Fix:** shared `useAnchoredPopover` (`layout/use.anchored.popover.ts`) on
`@floating-ui/dom` (same stack as mention suggestions) — `fixed` + `flip` +
`shift` + `size` max-width; `bottom-start` / `bottom-end` / `top-start` follow
`dir` for RTL.

**Menus wired:** Channel filter, list date-range, Create Post chevron, Help,
User, Notifications, org rail switcher, Select Customer, third-party ⋮, Delay
comment. Channel ⋮ (`launches/menu`) already fixed — now clamps X as well as Y.
Media more-menu already clamped — unchanged.

### Header chrome + Generate Posts modal (2026-08-05)

Owner screenshots: design Billing header = logo · title · **streak** · Help ·
bell · avatar (no Create Post). App Posts header had Create Post, missing streak;
Generate Posts modal bled the list through and duplicated “Output format”.

**Why the header diverged:** Create Post was portalled into `HeaderActionSlot` by
`launches.component.tsx` (gap-pass). Design header template has **zero** Create
Post — `chromeVals` `newBlankPost` / `newAiPost` / `toggleNewMenu` are dead
(same class as `openCommand`). Streak exists (`StreakComponent`) but returned
`null` when `user.streakSince` was unset, so chrome inventory dropped it.

**Fixes:**
- Streak always renders in header chrome (0 when no `streakSince`); still hidden
  on phone via `[data-mobile="1"] [data-streak]`.
- Create Post removed from header; Blank/AI split moved to calendar toolbar
  (`Filters`). Compose also stays on calendar cells + Channels → New post.
- Generate Posts modal: drop `bg-transparent` / invalid `size: 'xl'`; opaque
  `pqInner` card at 640px + close X. Second select label → **Tone** (prototype
  also duplicates “Output format” — Raise).

**Raises:**
- **Create Post placement:** CLAUDE.md previously said header slot; owner +
  design header inventory win. Parked on calendar toolbar — design has no
  toolbar Create either; confirm or prefer cells/Channels only.
- **Generator Tone label:** prototype template `:2908` says “Output format” for
  `genTone`; app uses Tone.
- Rail restore is another agent — this pass did not fight `rail.tsx` menus.

### Language picker polish — owner override (2026-08-05)

Owner: Language modal/tab looked unstandardized — `Intl.DisplayNames` mixed
lowercase autonyms (`français`, `español`, `русский`) with title-case ones
(`English`, `Deutsch`).

**LOOK (override beyond design fidelity):** Canonical autonym map matching
prototype `LANGUAGES` casing (Français / Español / Português / Italiano /
Русский / …; non-Latin עברית 中文 日本語 한국어 العربية unchanged). Tiles:
48px equal height, 10px gap, `minmax(158px,1fr)`, selected `bg-pqBrandFaint` +
1.5px brand ring + check, hover `bg-pqHover`. Header modal adds muted subtitle
(shared `language_settings_description`). Modal chrome already `bg-pqInner` /
r24 from `new-modal`.

**WORK:** Unchanged — same 14 locale codes, cookie + `i18next.changeLanguage` +
`dir` for he/ar.

### Global Settings silent autosave (2026-08-05)

Owner: changing Global Settings (AM:PM / 24h, email toggles, shortlink chips)
gave no feedback that anything persisted.

**Verdict:** Saves already worked. Date Metrics writes `localStorage.isUS`; email
and shortlink POST `/user/email-notifications` and `/settings/shortlink`. Email
and shortlink already called `useToaster` success, but Date Metrics had none —
and API failures were silent (no rollback / error toast).

**Fix:** All three show `settings_updated` / “Settings updated” on success
(reuse existing i18n key; prototype uses “Date metric saved” / “Saved” /
“Shortlink preference saved”). Email + shortlink check `response.ok`, roll back
optimistic UI, and toast `something_went_wrong` on failure. Skip no-op re-clicks
on metric/shortlink chips. Language tab untouched.

**Raises:** Prototype-specific toast copy not used (one consistent key). Date
Metrics remains browser-local only (pre-existing).

### Copilot empty channel chip — owner polish (2026-08-05)

Owner: AI Copilot empty channel row showed weak plain **none yet** (screenshot).

**Design vs app:** Compose sheet (`composeSelLabel`) uses pill `none yet` — still
correct in `manage.modal.tsx`. Copilot agent composer (`chatPostingLabel`) is
soft text **No channel selected** when empty, **Posting to** when selected — a
prior fidelity pass wrongly reused compose `none yet` for Copilot.

**Shipped (LOOK polish, WORK unchanged):** Muted h26 pill
`No channels selected · Select channels` (`t('no_channels_selected')` +
`t('select_channels')`); click opens mobile channels drawer or expands/scrolls
the desktop left `AgentList`. Selection still only via left list →
`PropertiesContext`.

Fidelity: [`docs/ui-fidelity-audit/create-post-copilot.md`](docs/ui-fidelity-audit/create-post-copilot.md).

### Settings fidelity — rail active + inline forms (2026-08-05)

Owner: More rail lit every Settings tab; Add webhook / nested forms widened the Settings
card and stacked blur; preferred **inline** editors over nested modals.

**Fixes (LOOK override; WORK unchanged):**
- `MenuItem`: `/settings?tab=X` active only when `searchParams.tab === X`; bare `/settings`
  still marks footer Settings.
- More NavIcon paths aligned to prototype `navItem()` inventory.
- Nested modal under Settings: `html.pq-modal-open` + `scrollbar-gutter: stable`; skip
  `.blurMe` blur when `[data-settings-scrim]` is present.
- `SettingsPaneEditor` (Back + title): Webhooks, Autopost, Signatures (Settings path),
  Teams invite, Integrations API-key form — list ↔ edit in the same card (no `openModal`).
- Composer signature picker still uses modal. Social Sets stays modal (**Raise** — heavy
  channel picker).

Fidelity: [`docs/ui-fidelity-audit/modals.md`](docs/ui-fidelity-audit/modals.md),
[`docs/ui-fidelity-audit/settings.md`](docs/ui-fidelity-audit/settings.md).

### Settings fidelity + inline forms (2026-08-05)

Owner: Settings felt small/washed when nested modals opened; More rail lit every
row on `/settings`; CRUD forms stacked as second modals.

**LOOK / stability**
- Rail active: `/settings?tab=X` only when tab matches; footer Settings for any
  settings visit (`menu-item.tsx`).
- Rail icons aligned for Posts / Channels / Webhooks.
- Nested modal: `scrollbar-gutter: stable` + skip `.blurMe` blur when
  `[data-settings-scrim]` so the settings card does not jump or wash out.

**WORK (owner override):** Design uses a stacked form overlay; owner asked for
in-pane editors. `SettingsPaneEditor` + list↔edit for Webhooks, Signatures
(Settings), Autopost, Teams invite, Integrations API key. APIs unchanged.
Delete/rotate confirms stay dialogs. Social Sets / Create Post / billing /
channel connect stay modal (**Raise** for Social Sets).

Fidelity: [`docs/ui-fidelity-audit/settings.md`](docs/ui-fidelity-audit/settings.md),
[`docs/ui-fidelity-audit/modals.md`](docs/ui-fidelity-audit/modals.md).

**Checks:** `scripts/ui-migration-check.sh` PASS — types 0/0 · api 152 · i18n
1235 · routes 29 · gates 14 (unchanged).

### Add Channel — Invite by link Copy UI (2026-08-05)

Owner: Invite by link still showed **Continue** after picking a platform;
design (`stepInviteDisplay`) shows the invite URL + **Copy link** + Back.

**LOOK:** `InviteLinkStep` — All platforms, platform row, muted tip, inset card
with one-hour copy, monospace URL field, brand Copy link, Back. Segmented
control gains design icons. Channels subtitle switches to the invite line when
mode is invite.

**WORK:** Same `GET /integrations/social/${identifier}` URL as before; copy +
toast only (no auto-close / no Continue). Connect myself unchanged.

**i18n:** +5 → 1240 (`all_platforms`, `copy_a_link_that_works_for_one_hour`,
`invite_link_copied_to_clipboard`, `invite_link_unavailable`,
`send_this_invite_link`) — baseline `--update`.

### Theme contrast audit — light/dark (2026-08-05)

Owner: light theme left labels/sections unreadable (screenshot: Move / add to
group → **Select Customer** light-on-light).

**Root cause:** Hardcoded `text-white` on Mantine Autocomplete label in
`customer.modal.tsx`; older form primitives and one-offs still used
`text-inputText` / Tailwind greys / SVG `fill="#fff"` on light surfaces.

**Fixes:** Select Customer label → `text-pqMuted` + themed Autocomplete chrome;
shared Canonical / CustomSelect / MultiSelect / Total / ColorPicker + Button
`text-pqOnBrand`; preview page, comments, statistics, date picker, AI image,
media alt-text, autopost/provider labels, continue-provider greys, analytics
hex → tokens. Detail:
[`docs/ui-fidelity-audit/theme-contrast.md`](docs/ui-fidelity-audit/theme-contrast.md).

**Raises:** Billing / lifetime pay paths need `billingEnabled` to screenshot;
composer provider panels need connected channels. Settings.component left alone
(sibling agents).

**Checks:** No i18n key changes — skipped `--update`.

### Channels list collapse + streak popover (2026-08-05)

Owner: Channels list missing Collapse; streak was a plain tooltip vs design
hover card; rail Unpin hairline vs CHANNELS header should share a rhythm.

**Channels LOOK:** Copilot-style column — header `p-[16px_14px_12px]` +
`border-b`, 26×26 collapse, 260→100 (`collapseMenu` cookie shared with
Copilot/plugs/analytics), Add h36 (brand when empty/adding), filters hidden
when collapsed, tablet auto-collapse like design `_autoSide`. Empty state
keeps the list column (CHANNELS 0). Rail symmetry via spacing recipe, not JS
lock.

**Streak LOOK:** `--streak` / `--streakSoft` tokens; design flame; hover
popover w270 with week grid + hint. **Raise:** omit Longest (no
`streakBest`). Week from continuous `streakSince`.

Fidelity: [`docs/ui-fidelity-audit/channels-reconnect.md`](docs/ui-fidelity-audit/channels-reconnect.md),
[`docs/ui-fidelity-audit/streak.md`](docs/ui-fidelity-audit/streak.md).

**i18n:** +4 → 1244 (`expand`, `n_day_posting_streak`,
`post_today_to_start_your_streak`,
`publish_at_least_one_post_today_to_keep_the_streak_alive`) — baseline
`--update`. Types/api/routes/gates unchanged.

### Dev workspace seed + Channels collapse / Copilot kebab (2026-08-05)

**NOT FOR PRODUCTION.** `scripts/seed-dev-workspace.mjs` fills a local org
with marker `dev-seed-ws*` — 10 placeholder channels (fake token
`dev-seed-not-a-real-token`), QUEUE/DRAFT/PUBLISHED posts, Redis analytics
stubs for allowlist providers, webhook/signatures/sets/autopost, a HeyGen
third-party row, and an optional user avatar Media. Revoke with `--revoke`.
Lifetime is separate: `node scripts/grant-lifetime.mjs --org <id>` when the
org has no subscription.

```
node scripts/seed-dev-workspace.mjs --email you@example.com
node scripts/seed-dev-workspace.mjs --org <orgId>
node scripts/seed-dev-workspace.mjs --email … --avatar /path/to/me.png
node scripts/seed-dev-workspace.mjs --email … --revoke
```

Avatar and seeded channel pictures share one file under `UPLOAD_DIRECTORY`,
served at `FRONTEND_URL/uploads/…` (pass `--avatar`; defaults to
`apps/frontend/public/no-picture.jpg`).

**Collapse fix:** Channels + Copilot `AgentList` no longer set `data-crhov`
(design's channels panel does not hover-expand — only the Chats rail does).
Hard widths `260` / `100` via `flex-[0_0_*]`. Tablet `_autoSide` depends on
viewport only so expanding on tablet is not immediately re-collapsed.

**Copilot kebab:** `TrialLockCard` overlay scoped to the chat column so Select
Channels (and the ⋮ Menu) stay clickable during trial lock.

**Settings → Integrations:** Connected rows from `GET /third-party` with
disconnect (`ThirdPartyMenuComponent`) above the catalog.

**Channels empty right pane (2026-08-05):** The large dark-grey hole was not a
wrong token — it was bare `bg-pqLine` (1px hairline color) with no content
column. Cause: SWR `fallbackData: []` made mount look empty → `adding=true`
without loading the catalog → neither Add nor detail mounted. Fix: wait for
list settle; zero channels → `openAdd()`; channels present → clear stuck
`adding` and select first; loading/add-pending shells use `bg-pqInner`.
Design always fills `--inner`; do not recolor `--line`. Plugs/analytics do
not share this list+detail empty hole.

**i18n:** +1 → 1245 (`available`) — baseline `--update` for that key only.
Types/api/routes/gates unchanged.

### Analytics channels column chrome (2026-08-05)

**Root cause:** `platform.analytics.tsx` still used the pre-migration ghost
list — unselected rows got `opacity-20 hover:opacity-100`, so seeded channels
looked blank beside the selected one. Design `chromeVals` channels panel (shared
with Channels / Copilot / plugs) uses selected `navActive` + brand rail and only
mild opacity for agent multi-select (`.6`) / locked (`.5`), not `.20`.

**LOOK:** Same recipe as Channels `listPane` / Copilot `AgentList` — uppercase
CHANNELS + count, 26×26 collapse, hard `260`/`100` via `flex-[0_0_*]` (no
`data-crhov`), Add Channel, 32px avatar + platform badge + name/meta, selected
`bg-pqNavActive` + 3px brand rail, `hover:bg-pqHover`. Auto-select first
analytics channel when none/stale. Cookie expiry + tablet `_autoSide` match
Channels. Seed data untouched.

### Channels declutter + media/analytics/panel DnD (2026-08-05)

Owner plan: list chrome, channel ⋮, media lightbox/alt text, approved-apps
seed, panel→calendar schedule, Copilot/Analytics Add Channel, Analytics header.

**Channels LOOK:** Removed All/Connected/Needs attention chips and the attention
banner (owner override vs design inventory). List meta for broken channels is
`Needs reconnect`; detail reconnect copy unchanged. Channel ⋮ anchors with
design `left-12` / `bottom+6`, stroke `MENU_ICONS`, Delete `text-pqWarn`.

**Media:** Lightbox portals to `document.body` with `--mediaScrim`
(`rgba(9,9,11,.86)`) so the rail is covered. Alt-text modal title
“Change alt text”, textarea + `ModalFormActions` (no grey Cancel).

**Calendar WORK:** Panel `QueueCard` drags `type: 'post'`. Schedule always sets
`QUEUE` (draft→scheduled). Success toast `Scheduled for {ddd · HH:mm}`.

**Copilot / Analytics Add Channel:** Navigate `/channels?add=1` (not the
provider modal). Hover uses `hover:bg-pqHover`.

**Analytics LOOK:** Header avatar+badge+name+`@meta · last N days` with 7d/30d/90d
chips; metric cards match design order (label/trend/value/chart) on `pqPop`.
Seed Redis stubs return ~6 series for denser demo.

**Seed:** Approved Apps — Claude / n8n / Zapier OAuthApp+Authorization (vendor
orgs for the OAuthApp unique constraint).

**Raises unchanged:** fake seed tokens; live analytics count = provider API;
lightbox Rename has no API; design Approved Apps gate on `public_api`.

**i18n:** intentional key churn — added alt-text / range / schedule toast /
analytics summary / `channel_menu`; removed filter + attention-banner +
`media_settings` keys. Baseline updated via
`scripts/ui-migration-check.sh --update`. Types/api/routes/gates clean.

### Settings fidelity — Integrations Match (2026-08-05)

Settings → Integrations is a single card grid (`GET /third-party/list` +
`GET /third-party` by identifier): Connected / Not connected status, **Add API
key** or **Update key** + **Disconnect** footers; no CONNECTED/AVAILABLE split
or kebab on this surface. API-key form stays in-pane via `SettingsPaneEditor`.
Media-library import unchanged.

### Settings overlay — keep page visible under scrim (2026-08-05)

Owner: Settings replaced the main column with a solid gray panel instead of
dimming the live page underneath (prototype `rgba(0,0,0,.55)` scrim).

**Root cause:** `/settings` was a full route swap — `{children}` unmounted the
calendar (etc.), so the translucent scrim only covered the empty layout shell.

**Fix:** Next.js parallel + intercept route `@modal/(.)settings` renders
`SettingsPage` in an `overlay` slot outside `.blurMe` / `overflow-hidden`;
soft navigation keeps the previous page mounted under the scrim. Hard URL
`/settings` still renders the full-page route (no prior page to preserve).

**Routes:** +1 intercept page (`@modal/(.)settings/page.tsx`); run
`scripts/ui-migration-check.sh --update` when merging.

### Chrome titles / subtitles fidelity (2026-08-05)

Owner audit: Calendar, Media, Billing chrome matched the prototype; **Connections**
header was blank and **Settings** mis-resolved to Social Sets when visiting
`/settings?tab=…` (More-menu deep-links share the `/settings` prefix).

**Fix:**
- `pageOnlyMenu`: `/connections` entry (title-only, same pattern as Auto-Plugs).
- `SUBTITLES['/connections']` → *Connect Claude, ChatGPT, MCP clients and more*
  (`subtitle_connections`).
- `title.tsx`: pathname under `/settings` always resolves h1 to Settings +
  `subtitle_settings`; tab titles stay in the settings sheet.
- In-page Connections overview subtitle → *Work with PostQueen across your
  favorite tools.* (`connections_sub`).

**Checks:** run `scripts/ui-migration-check.sh --update` for `subtitle_connections`.
**Smoke:** `/connections` h1+subtitle; `/settings` and `?tab=webhooks` h1 Settings
(not Social Sets); Calendar/Media unchanged.

### Connections detail fidelity (2026-08-05)

Owner: list view was OK; connector **detail** lacked design depth (prompt hero,
Your API key card, How to connect chrome). Reverses the earlier **No Reveal on
`/connections`** override — detail now shares Reveal / Copy / Rotate with
Developers (`api-key-card.tsx` + `POST /user/api-key/rotate`).

**LOOK:** gradient `@PostQueen` prompt pills, info blurb, shared API key card,
numbered steps inside a bordered “How to connect” card; inline copy on code blocks.

**WORK / accuracy:** per-connector prompts and steps stay repo-verified — no
design-invented `openclaw mcp add`, no official Zapier app; OpenClaw/Hermes keep
Agent Skills path; Zapier/Make stay SOON + HTTP/webhook.

**Chatbase:** `#chatbase-bubble-button` / `#chatbase-bubble-window` pinned
bottom-right in `global.scss` so the rail Settings / Upgrade footer stays visible.

**Checks:** run `scripts/ui-migration-check.sh --update` for new `conn_*` i18n keys.
**Smoke:** Claude / ChatGPT / n8n detail — prompts + key Reveal/Copy/Rotate +
How to connect; OpenClaw still skills; Zapier still SOON; page header unchanged
(`subtitle_connections` already in baseline from chrome-titles pass).

### Settings CTA hover — brightness washout (2026-08-05)

**Bug:** Connected Integrations **Update key** (`bg-pqSettings` on `bg-pqInner`
card) used `hover:brightness-110`, which brightens toward white in light theme —
hover vanished on white cards. Same anti-pattern on Channels **Add Channel**
when the list is non-empty.

**Design:** Prototype `settingsVals` tpCards CTA still shows
`filter:brightness(1.12)`; `design-change-log.md` (2026-08-02) replaced brightness
with a constant-strength `--hover` overlay tint. Doc 01: *never `filter:brightness()`*.

**Fix:** `hover:bg-pqBrandSoft` (`--brandSoft`) + `transition-colors` on
`bg-pqSettings` rest (Integrations **Update key**, Channels **Add Channel**
secondary). Avoid `hover:bg-pqHover` as a full fill replace on solid
`bg-pqSettings` — it washes toward white. Channels brand primary:
`hover:bg-pqBrandHover` instead of brightness.

**Tokens:** `--brandSoft` → `pqBrandSoft`; `--brandHover` → `pqBrandHover`.

### DEV billing stage switcher — REMOVED (2026-08-05 remaining pass)

Temporary localhost billing-state switcher deleted:
`dev-billing-stage*.ts(x)`, layout/billing/`FinishTrial` `dryRun` call sites.
Use real Stripe/account state for billing QA. Drop
`NEXT_PUBLIC_DEV_BILLING_STAGE` from env if still set.

### Channels list column width parity (2026-08-05)

**Root cause:** Copilot `AgentList` and `/plugs` still diverged from Channels
`listPane` — missing `shrink-0` / `inset-0` shell, Add button stayed full-width
when collapsed, Plugs kept pre-migration `p-[20px]` column without
`flex-[0_0_*]` or shared header/row recipe.

**Fix:** All left channel columns now use hard **260 / 100** via
`flex-[0_0_*]`, header `p-[16px_14px_12px]`, Add h36 (36×36 icon when
collapsed), list `px-[8px] pb-[12px]` + row `py-[7px] ps-[9px] pe-[6px]`.
Copilot kebab stays off (`showKebab` default false); Channels detail ⋮ and
Analytics list ⋮ unchanged. App rail **236 / 60** untouched; Copilot Chats rail
**232 / 56** untouched.

**Files:** `agent.tsx`, `plugs.tsx`, `platform.analytics.tsx` (mobile
`max-w-full` only).

### Panel collapse / pin tooltips (2026-08-05)

**Problem:** Left-column double-chevron collapse buttons carried `data-tip` (no
CSS/JS handler) and generic Expand/Collapse copy. Main-rail pin and Copilot Chats
pin lacked hover labels when icon-only.

**Fix:** Wire `data-tooltip-id="tooltip"` + `data-tooltip-content` (existing
`react-tooltip` host in `layout.component.tsx`). Channel columns toggle
`show_channels` / `hide_channels`; icon-only Add Channel gets `add_channel`;
main rail pin keeps `pin_sidebar` / `unpin_sidebar`; Copilot Chats rail pin keeps
`pin_chats` / `unpin_chats`; collapsed New chat link gets `new_chat`.

**Checks:** run `scripts/ui-migration-check.sh --update` for `show_channels`,
`hide_channels` i18n keys.

### Billing payment-failed strip — danger token (2026-08-05)

**Problem:** The payFail banner and its "Update payment method" CTA used `pqWarn`
(`--warn`: `#f87171` dark / `#dc2626` light). In dark mode that reads pink/coral;
the prototype hardcodes `#ef4444` / `rgba(239,68,68,…)` for the strip, icon chip,
outline, and CTA (`billingVals()` :2322–2330).

**Fix:** Added `--danger` / `--dangerSoft` / `--dangerLine` / `--dangerChip`
(same `#ef4444` base in both themes) and switched the payment-failed strip to
`pqDanger*`. `--warn` stays for disconnect badges and other warning surfaces.

### Checkout Stripe mount + error UI (2026-08-05)

**Diagnosis:** Order summary and sticky Pay bar were already implemented but gated
on Stripe Checkout `success` + PaymentElement `onReady`. When `POST /billing/embedded`
failed or CheckoutProvider stayed loading/error, `FormWrapper` returned `null` —
Payment details looked empty and plan selection felt broken. Local Stripe keys
(`pk_test_51Tu…` / `sk_test_51Tu…`) create `client_secret` successfully; mismatch
or missing keys is the usual env failure mode.

**Fix:** `embedded.billing.tsx` — visible loading skeleton + error panel inside
Payment details (no silent null); shell stays mounted while secret/theme swaps
(no blank Payment details card); Order summary / SubmitBar still Stripe-gated.
`first.billing.component.tsx` — embed `!res.ok` throws into SWR so API errors
show; missing `client_secret` surfaces in-card.

**Lapsed LOOK (design `subEnded`):** headline is now “Pick up **where you left
off**” (brand highlight on the full phrase, no trailing “with PostQueen”);
amber banner uses warn-dot chrome + body *Nothing will go out until you
subscribe again.*; title stays dateless (subscription row hard-deleted — no
client end date). Sticky bar for non-trial: “$X due today” + plan subline +
**Resubscribe to {plan} – $X** (was bare “Pay Now”). Order-summary cancel
blurb splits trial vs lapsed tails per design `pwCancelTail`.

### AI Copilot — block reconnect channel select (2026-08-05)

**Prototype delta:** The Agent rail (`agentVals()`) lets every channel row toggle
on/off, including disconnected ones with the red `!` badge. **Product decision:**
match Analytics / Plugs / Channels WORK — channels with `refreshNeeded` or
`inBetweenSteps` cannot be selected for Copilot scheduling.

**Implemented (WORK safety; LOOK unchanged except cursor):**
- `agent.tsx` — `setIntegration` toast + return on add; deselect still allowed;
  `cursor-not-allowed` on blocked rows; no selected tick when blocked; prune
  `selected` / `properties` after list mutate when a channel falls into
  `needsAttention`.
- `agent.chat.tsx` — filter `needsAttention` out of CopilotKit `properties.integrations`
  and `[--integrations--]` on send so stale picks do not reach the model.
- `integration.schedule.post.ts` — reject `disabled` / `refreshNeeded` /
  `inBetweenSteps` after `getIntegrationById`.
- `integration.list.tool.ts` — exclude those integrations from the scheduleable list.

**Toast copy:** `channel_disconnected_click_to_reconnect` (same key as Channels list).
No OAuth redirect from Copilot — user reconnects from Channels.

**Checks:** re-run `scripts/ui-migration-check.sh --update` after i18n key adds.

### Shell / chrome fidelity sweep (2026-08-05)

Owner sweep: rail, header title/subtitles, Help menu, pin/unpin, Chatbase vs rail
footer, logo version chip, Create Post placement, Settings intercept overlay.

**Fixed (LOOK):**
- **Create Post → header** (owner override): Blank/AI split portalled back into
  `HeaderActionSlot` from `launches.component.tsx`; removed from calendar
  `Filters` toolbar. Button tokens → `bg-pqBrand` / `text-pqOnBrand`.
- **Founding member header chip:** `ltHeaderDisplay` analogue — amber pill with
  heart before streak when `user.isLifetime || user.isTrailing` (desktop only);
  tokens `pqLtChipBg` / `pqLtAmber` / `--ltOutline`.
- **Settings scrim:** `bg-black/55` → `bg-pqPopup` (`--popup`) to match prototype
  `settingsOpen` overlay.
- **Help menu Setup tour icon:** play glyph → prototype check-circle path
  (`helpMenu[0].icon`).
- **Logo version chip:** `tabular-nums` on `appVersionLabel` (prototype `data-num`).
- **Chatbase bubble:** bottom-trailing pin uses `inset-inline-*` + explicit RTL
  override so the rail Settings / Upgrade footer stays reachable in both directions.

**Already matched (no code change):**
- Rail pin/unpin row + collapsed hover-expand (`rail.tsx`, `[data-sb]` in
  `global.scss`).
- Header h1 + subtitles (`title.tsx` — Connections/Settings fixes from prior pass).
- Settings intercept `@modal/(.)settings` keeps prior page under scrim.
- Pin tooltips wired via `react-tooltip`.

**Raises (unchanged):**
- **Create Post vs design inventory:** prototype header has no Create Post;
  owner places it in the header anyway — calendar cells + Channels → New post
  remain alternate entry points.
- **Keyboard shortcuts** in Help menu — locked row, no WORK behind it (Intentional).
- **Streak “Longest: N days”** — no `streakBest` in schema.
- **`chromeVals` dead handlers** — `openCommand`, `usageMeters`, `newBlankPost`
  in vals but not rendered in prototype template; do not build from docs alone.
- **Generator Tone label** — prototype duplicates “Output format”; app uses Tone.

**Checks:** `scripts/ui-migration-check.sh` — types clean; i18n/gates deltas are
from other in-flight steps (analytics/plugs copy), not this shell pass.

### Main product screens fidelity sweep (2026-08-05)

Scope: Calendar/Posts, Channels, AI Copilot (did not touch `setIntegration` /
reconnect-select WORK), Analytics, Media (alt/lightbox), Connections detail,
Plugs/Auto-Plugs. Design LOOK / repo WORK; `colors.scss` tokens only.

**Fixed (CRITICAL LOOK):**
- **Auto-Plugs detail** (`plug.tsx`): legacy `bg-newTableHeader` 300px tiles →
  design card grid (`minmax(320px,1fr)`, `--pop` inset ring, bolt tile, channel
  meta line, `Set up plug` / `Edit plug`, toggle tooltips). Pane padding
  `18/22/40`, max-width 1000.
- **Plugs + Analytics empty states:** prototype copy + icon tile + brand
  **Connect a channel** → `/channels?add=1` (not calendar redirect). Plugs
  reconnect toast → `channel_disconnected_click_to_reconnect`.
- **Calendar/Posts:** publish-error badge `bg-red-500` → `pqDanger`; today
  pill `text-pqOnBrand`; See-all chip hover `brightness` → `pqBrandFaint`;
  queue reconnect overlay → `pqWarn` + `pqBrand/60`.
- **Channels list:** warn `!` badge `text-white` → `text-pqOnBrand`.
- **Hover tokens:** Media Upload, Copilot New chat + send, Connections code
  copy, Add Channel continue — `hover:brightness*` → `pqBrandHover` /
  `pqHover` (doc 01 anti-pattern).
- **Media alt modal:** video thumbnail actions → `pqBrand` / `pqSettings` /
  `pqDanger*` (was `bg-forth` / `bg-red-600`).
- **Channel filter** selected pill `text-pqOnBrand`.

**Already matched (no change this pass):**
- Header subtitles for Calendar, Media, Connections, Agents, Plugs, Analytics.
- Copilot empty hero, PQ avatar, composer `--pop` frame, trial lock overlay,
  channel column chrome, Chats rail, Connections detail (prompt hero + API key
  card) from prior passes.

**Remaining gaps by severity:**

| Severity | Surface | Gap |
| --- | --- | --- |
| **Raise** | AI Copilot | Draft-plan card before composer — no `chatHasPlan` hook (`ai-copilot.md` #11) |
| **Raise** | Composer | Screenshot matrix still owed (connected channel) |
| **Delta** | Media | Rename menu item — no API; SDK thumbnail ceiling |
| **Delta** | Billing | Photo matrix + plan-card nits (out of scope but listed in MASTER) |
| **Delta** | Settings / Developers | Access pills, Sets table chrome (out of scope) |
| **Intentional** | Help | Keyboard shortcuts locked row |
| **Intentional** | Plugs layout | Repo keeps channel column + per-channel plug grid; prototype `isPlugs` block is grid-only when panel hidden — both capabilities preserved |

**Checks:** `scripts/ui-migration-check.sh` — types 0/0 · api 152 · routes 30.
**i18n** intentional adds: `connect_a_channel`, `no_analytics_yet`,
`analytics_empty_connect_hint`, `no_plugs_for_these_channels`,
`auto_plugs_supported_channels`, `edit_plug`, `turn_on`, `turn_off` — run
`--update` when merging. **gates** tip drift unrelated to this pass.

### Billing + Settings + Checkout fidelity sweep (2026-08-05)

Compared `settingsVals()` (Integrations cards, Webhooks/Signatures list +
form chrome), billing page banners (`payFailShow`, trial/discount/cancel strips),
and checkout paywall (`pwHead*`, order summary, sticky CTA) against repo. Stripe
CheckoutProvider / PaymentElement / `checkout.confirm()` untouched.

**Fixed (LOOK):**
- **Settings dual-back:** in-pane editors (Webhooks, Autopost, Signatures,
  Integrations API key) hid the sheet-level h3/desc while `SettingsPaneEditor` is
  open — no more stacked “Webhooks” + Back/“Update webhook”.
- **Settings tab titles:** Webhooks → `Webhooks (n/limit)` from live list +
  `user.tier.webhooks`; Sets → `Social Sets (n)`; Autopost tab title →
  **Autopost** (design `settingsVals` TAB, nav row stays “Auto Post”).
- **Settings h3 chrome:** `font-display`, `-tracking`, token colours on sheet
  title (prototype h3 20/500).
- **Checkout sticky CTA:** non-trial Stripe sessions on **first** checkout now
  **Pay Now** (`billing_pay_now`); **Resubscribe to {plan} – $X** only when
  `!user.allowTrial` (lapsed / `subEnded`). Trial sessions unchanged
  (`Pay $0 Today – Start your free trial!`). Order summary + bar still gated on
  Checkout `success` + PaymentElement `onReady`.
- **Payment-failed strip:** already on `pqDanger*` tokens from prior pass —
  verified against prototype `#ef4444` gradient/outline/CTA.

**Already matched (no code):** first-checkout hero (“Your first **n days are
free**” / lapsed “Pick up **where you left off**” + amber ended banner);
Integrations card grid (Connected dot, Add/Update key + Disconnect, 31px CTAs);
Webhooks/Signatures list rows + `ModalFormActions` form footers; billing Plans h2,
lifetime/trial/discount/cancel banners; checkout header “Checkout” label + order
summary portaled to `#pq-order-summary`.

**i18n:** +2 keys — `webhooks_quota_title`, `social_sets_count`. Baseline
updated (`1293` keys). **gates** snapshot refreshed (dev billing switcher
overrides in local QA).

**Raises (behaviour / data the design fakes — not implemented):**
- **Lapsed checkout banner date:** design `pwLapsedTitle` names end date; client
  has no reliable `cancelAt`/period end once subscription row is hard-deleted —
  title stays dateless (“Your subscription ended.”).
- **Billing payment-failed body:** prototype invents “Last attempt failed on … /
  Publishing pauses in N days”; repo keeps Stripe-accurate copy (“Update… we will
  try again. Nothing is cancelled yet.”) — no invented retry deadline.
- **Sets editor:** design uses in-sheet forms; repo still opens full-screen
  `AddEditModal` for set compose — capability preserved, chrome differs.
- **Checkout screenshot matrix:** still owed on this install (`billingEnabled` +
  Stripe keys); DEV billing switcher covers LOOK states only — Pay bar still hits
  real Stripe when clicked.

**Checks:** `scripts/ui-migration-check.sh --update` — i18n/routes/gates/api
baselines written; frontend types fail on pre-existing `agent.chat.tsx` narrow
type (unrelated). Stripe embed path not exercised in CI.

### Remaining UI work pass (2026-08-05)

**LOOK shipped (no handler/API rewrites):**
- Settings Developers compact `ApiKeyCard` + Open Connections; Access/Apps kept;
  Apps OAuth chrome → `--pop` / 30px pills; Sets header/pills/CTA; Signatures CSS
  truncate + Auto add? line; Approved Apps Revoke pill.
- Compose sheet: r20, `--bg` headers, 30×30 close, settings accordion
  `--tableHeader`, Schedule split + click Post Now; editor legacy → `pq*`.
- Calendar month: 24px `data-mpost` chips + day pill / count.
- Billing residual legacy tokens: already clear in `billing/*` (FAQ/plan cards
  on `pq*`) — checklist reconciled; no Stripe/price inventing.

**Cleanup:** DEV billing stage switcher removed (files + call sites + `dryRun`).
Seed revoke attempted; use local `DATABASE_URL` on `:5432` when Postgres is up:
`node scripts/seed-dev-workspace.mjs --email … --revoke`.

**Raises unchanged (documented, no fake WORK):** CREATOR $132; months-free vs
coupon; Copilot draft-plan; Sets fullscreen modal; Media Rename; Streak Longest;
Custom URL always; Claude/ChatGPT write picker; Compose “Edit Post” title;
in-sheet AI FAB; groupCell merge; lapsed/payFail invented dates; Generator Tone;
Help shortcuts locked; lifetime $24.50 retention skip.

**Photo QA debt (process, not code):** billing 14×2 matrix
(`billing-photo-fixture.md`); compose @ 420/900/1440 light+dark with a connected
channel. Flip MASTER photo rows only after screenshots.

**Checks:** `scripts/ui-migration-check.sh --update` — gates delta from removing
dev billing `allowTrial`/`isTrailing` override sites; types/api/i18n/routes clean.

### Photo QA close pass (2026-08-05)

**Env:** FE `:4200` + BE `:3000`; re-seeded
`gokhan@gokhankinay.com` (channels/posts); JWT via local `JWT_SECRET` → `PQ_AUTH`.

**Compose (6/6):** `docs/ui-shots/compose-qa/compose-{420,900,1440}-{light,dark}.png`
after Create Post → Continue without set (`data-pq="continue-without-set"` added for
the shot tool). Chrome Match vs prototype; no LOOK code change required.

**Billing matrix:** only **#03 CREATOR × active** shootable on this account
(`03-creator-active-1440-{light,dark}.png`). Cells 01–02, 04–14 **blocked** (no DEV
billing switcher; `/billing/lifetime` redirects to `/billing`). Live `/billing` HTML
has no `bg-sixth`/`newBg*`. FAQ + Plans + MOST POPULAR + portal row confirmed.
`billing.md` §C historical `[ ]` reconciled to `[x]` where code+shot prove Match.

**Raises unchanged.** Product states for the other 13 billing cells need real
Stripe/account fixtures if a full 14×2 matrix is required later.

### Next leftovers pass (2026-08-05)

**LOOK:** Compose title toggles to **Edit Post** when `existingData.integration`
(`manage.modal.tsx` + `edit_post_title` key).

**Media thumbs Delta:** not an SDK/LOOK bug — seed default copied
`public/no-picture.jpg` (silhouette) into uploads. Seed now generates a branded
NW PNG via `sharp` when `--avatar` is omitted. Shots:
`docs/ui-shots/media-qa/media-1440-{light,dark}.png`,
`compose-thumbs-1440-dark.png` (channel circles show NW).

**Design vs app Raises** logged in `MASTER.md` (Sets modal, draft-plan, Rename,
Streak Longest, CREATOR/$132, Help shortcuts, AI FAB, aiagents picker, groupCell,
lapsed dates, billing cells blocked). No fake WORK.

**Checks:** `scripts/ui-migration-check.sh --update` — i18n +1 key
`edit_post_title`; types/api/routes/gates clean.


### Responsive fidelity (2026-08-05)

Structural responsive pass keyed off `useViewport()` (mobile <760 / tablet 760–1179 / desktop ≥1180). Tailwind `mobile:`/`tablet:` screens (1025/1300) left untouched.

**Phase 1 — Channels / Analytics / Plugs drawers**
- Shared `TwoColumnDetailDrawer` (`layout/two-column-detail-drawer.tsx`): passthrough ≥760; phone = full-bleed off-canvas detail with `bg-pqPopup` scrim, `shadow-pqE3`, z 72/78, measured top below chrome (Agent tokens). Back + Escape + scrim close.
- Removed dead `max-mobile:hidden` from Channels + Analytics detail (was hiding detail through ≤1025).
- Phone starts on list; tapping a channel opens the drawer. Auto-select does not open it. Channels Add pane uses the same drawer surface.
- Desktop/tablet keep two-column + existing `_autoSide` cookie collapse.

**Phase 2 — Compose stack**
- `manage.modal.tsx`: under 760, editor + preview `flex-col`; preview `max-h-[340px]` / full width (no fixed `w-[580px]` row). Legacy `mobile:p-0` / `tablet:p-[16px]` pad kept. No provider-settings rewrite.

**Phase 3 — Checkout breakpoints**
- `first.billing.component.tsx`: stack + side `w-full` via `useViewport` at <1180; H1 34 / 42 / 54 at mobile / tablet / desktop (drops `mobile:!text-[34px]` winning in the 760–1025 band). Stripe WORK unchanged. Subscribed `/billing` Plans page photographed instead of unpaid checkout on this seed.

**Phase 4 — Soft outs (intentional)**
- Settings: left as Match; no change.
- Media: left legacy grid (no Tailwind screen cut).
- Auth login: **document only — no redesign** (shots under `docs/ui-shots/responsive/auth-login-*` for reference).
- DEV billing switcher: **not restored**.
- Calendar week @420: horizontal clip still visible in shots; not auto-switched to Day (no product Raise / behaviour invent). Compose footer crowding @420 pre-existing outside the editor/preview stack change.

**Checks:** `scripts/ui-migration-check.sh` — **PASS** (types 0/0, api 152, i18n 1294, routes 30, gates 14). No baseline update.

**Shots:** `docs/ui-shots/responsive/` — 420 / 900 / 1440 × light/dark for launches, channels (+ `channels-detail-420`), analytics (+ `analytics-detail-420`), plugs, agents, media, settings, billing, connections, auth-login, compose. Auth via `PQ_AUTH` JWT (`gokhan@gokhankinay.com`) + `PQ_HOST=localhost`.

### Post-redesign regression audit (2026-08-05)

**Verdict:** Responsive redesign did **not** break WORK (drawers/compose/checkout/select/add/reconnect stay wired; no false-alarm “fixes”).

**Success feeling closed:** Time Table save now toasts `settings_updated` after the existing POST/mutate/closeAll (`time.table.tsx`). Design said “Updated”; Channels-surface peers use the same key.

**Left as pre-existing silents (not redesign removals):** plug on/off toggle; media alt-text / settings save (modal close only). No toast invent for those.

**Soft verify compose @420:** skipped — FE not up (`localhost:4200` unreachable). No unreachable-action fix applied.

### Teams Settings — inline upgrade lock (2026-08-06)

**Owner:** Keep Teams in Settings Workspace for org admins even when the plan
lacks `team_members`. Do **not** mount `TeamsComponent` (no `GET /settings/team`)
so the global 402 “Payment Required” dialog never fires; show `TeamsUpgradeLock`
inline with billing CTA instead. USER role still hidden. Non-admin member list
(view-only + disabled Invite) deferred — needs backend GET policy change.

**Checks:** i18n key `subscription_does_not_include_team_members`; gates
`tier.team_members` call-site count −1 (nav no longer gated); other gate churn
from concurrent WIP baselines refreshed with `--update`.

**Follow-up (same day):** Global 402 handler still opened “Payment Required” when
`TeamsComponent` mounted despite the nav gate — e.g. DEV billing-stage override
claims GROWTH+ while the real sub is CREATOR. Fix: skip the dialog for
`GET /settings/team` 402 in `layout.context.tsx`; `TeamsComponent` renders
`TeamsUpgradeLock` on that status. POST/DELETE team still use the global dialog.

### Calendar → Posts panel: convert to DRAFT (2026-08-06)

**Owner request:** Drag Scheduled/Drafts from the calendar onto the left Posts
panel to **really** set `state=DRAFT` (Temporal stopped). Not in the design.

- App `PUT /posts/:id/status` (DTO → controller → existing `changePostStatus`);
  rejects PUBLISHED/ERROR; draft clears `releaseId`/`releaseURL`; idempotent DRAFT.
- Panel `useDrop` on Scheduled/Drafts list only; Posted rejects; cell
  `PUT /:id/date` reschedule untouched. Toast `moved_to_drafts`; `publishDate`
  kept (Drafts list still needs `publishDate >= now`).

**Follow-up:** Owner — DRAFT must **leave the calendar grid** (panel only).
`getPosts` now `state: { not: DRAFT }`; `calendarPosts` also filters DRAFT
(demo/stale). Design still paints drafts on Day — owner overrides.
`publishDate` still kept so Drafts panel list stays populated.

**Checks:** `scripts/ui-migration-check.sh` PASS after draft-hide follow-up
(api 155, i18n 1314, routes 30, gates 14). Cell reschedule still
`PUT /posts/:id/date` only.

### Checkout fidelity — Order Summary, Lifetime, layout (2026-08-06)

**Owner:** Checkout felt empty vs design (Order summary / coupon / pay bar);
Lifetime redirected away; copy said Creator not Pro; lifetime gradient banded.

**Fixes:**
- Lifetime selectable in-place (`checkoutMode`); card on/off + Pro features;
  pay bar → `POST /billing/lifetime-checkout` with honest **$49 due today** (not
  design’s fake $0 lifetime trial — raised).
- Order summary always visible: subscription fallback while Stripe loads;
  Lifetime static summary; coupon chrome on monthly.
- Right column `560px`; `--ltCardOn/Off` no longer fade to bare transparent.
- `grantLifetimeFromPayment` floors ladder at **PRO**; code redemption unchanged.

**Raise:** Design prototypes Lifetime + $0 trial then charge later; repo charges
immediately via hosted Checkout — keep WORK honest until deferred charge exists.

**Checks:** `scripts/ui-migration-check.sh --update` PASS (i18n 1299→1313 new
checkout keys; api/routes/gates unchanged).

### Confirm CTA coral → brand / danger (2026-08-05)

**Problem:** Compose “Yes, close it!” used coral/pink in dark — not brand purple. Cause: `deleteDialog` always passed `danger: true`, and `DecisionModal` painted danger with `bg-pqWarn` (`--warn` `#f87171` in dark).

**Fix:**
- `DecisionModal` + `Button` `danger` → `bg-pqDanger` (`#ef4444`), not `pqWarn`
- Close confirms (`manage.modal` askClose, `modal.wrapper`, chrome `askClose`) pass `danger: false` → `bg-pqBrand`
- Billing cancel filled CTAs + media lightbox delete hover → `pqDanger`
- Reconnect `!` badges keep `pqWarn` (status chips, not primary CTA fill)
- Design `--pink` / `pqPink` (Post Now magenta) untouched — different token

**Verify:** `scripts/ui-migration-check.sh` PASS (types / api / i18n / routes / gates).

### Channel ⋮ + media ⋯ anchor + Auto Post nav (2026-08-05)

**Problem:** Channel ⋮ menu opened far from the trigger (manual `fixed` left/top). Channels list rows lacked ⋮ while calendar peers had it. Settings More / rail hid Auto Post behind `tier.autoPost` (CREATOR/STANDARD — Social Sets/Signatures/Webhooks still visible).

**Fix:**
- Channel `Menu` + media more-menu → `useAnchoredPopover` (`bottom-end`, portal to `document.body`)
- Channels list rows get the same ⋮ as detail / calendar column
- Auto Post always in Settings More + rail for non-FREE (label `Auto Post`); pane renders without `autoPost` capability gate

**Checks:** `scripts/ui-migration-check.sh` PASS. Gates baseline refreshed: `tier.autoPost` nav/pane gates dropped (4→1 residual elsewhere); `tier.current` +2 for Auto Post joining Sets/Signatures FREE gate.

### Notifications popover (2026-08-05)

**Problem:** Header bell panel painted every unread row solid purple (`bg-seventh` → `--brandHover`), so unread vs read was unclear; header lacked design’s “Mark all read”.

**Design (`chromeVals` / template ~256–275):** panel `--inner` + border + shadow; rows `padding 11×16`, unread = `--brandSoft` tint + 6px `--brand` dot + weight 600; read = transparent + no dot; header “Mark all read”.

**Fix (`notification.component.tsx`):**
- Surface: `bg-pqInner` / `border-pqBorder` / `shadow-pq` / `rounded-pqLg` / `animate-pqPop` (was `bg-third` + solid seventh rows)
- Unread: `bg-pqBrandSoft` + brand dot + `font-[600]`; read: transparent row, no solid purple
- Removed `animate-newMessages` (keyed off solid `--color-seventh`)
- Bell badge: `bg-pqPink` token (no hex); button chrome matches design hit target

**Mark all read — wired (not Raise):**
- Design shows the control. No dedicated POST endpoint exists.
- Existing WORK: `GET /notifications/list` already advances `lastReadNotifications` when the panel opens.
- Button clears unread LOOK locally + existing toaster (“All notifications marked as read”); does not invent backend.

**Root cause note (channel ⋮):** `.trz { transform: translateZ(0) }` on channel
columns made `position: fixed` coords resolve against the column, not the
viewport — portal to `document.body` is required. Gates baseline refreshed:
`tier.autoPost` 4→1 (nav no longer hides Auto Post on that flag); `tier.current`
21→23 (Auto Post + pane use paid-tier check like Sets/Signatures).

### Autopost form hairlines + Add Channel double back (2026-08-06)

**Problems:** Add Autopost showed light horizontal rules through the form and a
tiny text Back next to a large title. Add Channel connect step had two backs —
title-adjacent chevron plus boxed All platforms.

**Root cause (hairlines):** Form wrapper used `border border-pqLine`. On dark,
`--line` / `pqLine` is `rgba(255,255,255,0.07)` — reads as unintended white
rules. Webhooks already omitted that box.

**Fixes (LOOK only; WORK unchanged):**
- Autopost form: drop outer `pqLine` border; stack fields with `gap-[16px]` like
  Webhooks.
- `SettingsPaneEditor` Back → Channels-style boxed pill (`bg-pqSettings`,
  chevron + label) — covers Autopost, Webhooks, Signatures, Teams invite,
  Integrations API key.
- Add Channel: `onStepChange` from `AddProviderComponent`; hide parent title
  chevron while connect step shows boxed All platforms (design `connect-step`).

**Checks:** `scripts/ui-migration-check.sh` — api 155 · i18n 1299 · routes 30 ·
gates 14 · backend types 0 — all unchanged. Frontend types FAIL is ambient
`Integrations` narrowing across channels/launches/plugs/sets (pre-existing;
none of the edited symbols in settings-pane-editor / autopost /
add.provider / channels `onStepChange` path).

### Connected channel order (platform importance) (2026-08-06)

**Problem:** Channels list, calendar channel filter, and other connected-channel
panels each showed a different order (API/DB order vs alphabetical
`identifier`).

**Canonical order:** `socialIntegrationList` in
`libraries/nestjs-libraries/src/integrations/integration.manager.ts` (same
order Add Channel already uses via `/integrations/social`). Mirrored as
`PROVIDER_DISPLAY_ORDER` in
`apps/frontend/src/components/launches/helpers/sort.integrations.ts`.

**Fix (client-side only; API untouched):**
- Shared `sortIntegrationsByProviderImportance` — enabled first, then provider
  rank, then account `name`, then `id`
- Applied via `useIntegrationList` + panel `sortedIntegrations` (calendar,
  agents, plugs, analytics) and PickPlatforms in autopost/webhooks
- Add Channel grid left as-is (already registry order within categories)

**Checks:** `scripts/ui-migration-check.sh` PASS (types 0 · api 155 · i18n 1300 ·
routes 30 · gates 14).

### Calendar Day view fidelity (+ Week/Month audit) (2026-08-06)

**Design methods:** `calendarVals()` / `gridVals()`; templates `showDay` /
`dayRows` (~1433–1474), `showWeek` / `weekRows` (~1302–1351), `showMonth` /
`monthCells` (~1477–1510).

**Problem (Day):** Day still used the pre-migration layout — rows built from
`integrations.time` autopost minutes + posts, centered purple/brand-faint bands
of greyscale channel icons, white hairlines from cell `border-pqLine` on that
band chrome. No hourly clickable empty slots. Looked nothing like the Posts list
/ prototype day timeline.

**Day fix (`calendar.tsx` + `global.scss`):**
- `DayView` → 24 hour rows, 76px time gutter, `border-t` / `border-e` hairlines
  (`--line`), scroll opens at 07:00 like week
- Hour bucketing for posts (same as week); drop / `PUT /posts/:id/date` /
  compose-from-slot unchanged
- Empty slots: always-visible chip “Add a post at HH:00” / “Date passed”
  (`add_a_post_at` i18n); whole slot clickable when future
- Day cards: max 560px, content-first, channel name + status chip/dot + time,
  accent stripe (status colours), actions top-end — list-adjacent per prototype
- Removed autopost icon bands; day cells no longer draw week-style borders /
  hatch (parent owns hairlines) — kills the white lines
- `[data-dayslot]` overflow visible so stacked posts are not clipped

**Week audit:** Already matches `weekRows` (hour grid, hatch past, today tint,
See all >2, cell cards, drop rings). Intentional outs kept: 72px hour column
(12h locale), 84px day floor (channel column beside grid). No code change.

**Month audit / small LOOK:**
- Out-of-month cells `bg-pqTableHeader` + soft day number (prototype)
- Sticky DOW headers get `border-s` hairline like design

**Raises (behaviour design has / we do not invent):**
- Prototype month DOW headers call `onOpenDay` into a demo weekday list filter —
  our headers are labels; day open stays on “See all” / overflow chips
- Design day does **not** surface channel publishing-time rows; time slots stay
  in channel ⋮ → Time table (WORK preserved, LOOK removed from Day)
- Design day cards omit list-style status pills / tags — compact day card wins
  over copying the Posts list row 1:1

**Checks:** `scripts/ui-migration-check.sh` PASS. i18n **1300** (+`add_a_post_at`).
api 155 · routes 30 · gates 14 unchanged.

### Day view — centered reading column (2026-08-06)

**Owner:** Day timeline felt stuck left / sparse in the wide app shell. Wanted
Posts-list calm centering without losing hour slots.

**Fix:** Wrap Day hour rows in `mx-auto max-w-[700px] px-[16px]` (76 + 560 + pad);
slightly taller time gutter `py-[14px]`. Keep gutter / chips / DnD / day cards.
Intentional divergence from prototype full-bleed Day — documented.

**Also:** Calendar `getPosts` excludes `DRAFT` (completes drafts-leave-calendar).

### Tour — Channels shows Add Channel; finish card stays up (2026-08-06)

**Owner:** Step “Your accounts live here” still showed calendar; last card
scrolled the page to the bottom of the platform grid.

**Fix:**
- `nav-channels` step → `/channels` + `needs: 'channel-add'` (Add Channel open)
- `platform-grid`: `scrollIntoView({ block: 'start' })` + pane `scrollTop = 0`;
  not treated as `huge`; card placed near top of grid

### Invite by link stuck on Loading (2026-08-06)

**Cause:** `customFetch` returned an **unresolved Promise** when `afterRequest`
returned false (user dismissed 402 Payment Required / 406 trial dialog). Invite
UI awaited that fetch → eternal “Loading…”. Original invite still used the same
`GET /integrations/social/:id` — WORK was fine; the hang was global.

**Fix:** Synthetic `{ err: true }` Response instead of hanging; InviteLinkStep
clears loading, shows unavailable + Retry.

### Teams Settings — locked empty state polish (2026-08-06)

**Owner:** Locked Teams pane looked sparse — narrow left-aligned block, redundant
“Teams” heading under “Team Members”, weak “Move to billing” CTA, no lock visual.

**Fix (`TeamsUpgradeLock`):** Full-width inset card (analytics empty / TrialLockCard
language) — brand-soft lock tile, “Unlock team members” title, existing body
copy, CTA **Upgrade plan** → `/billing` (unchanged route). Dropped nested
“Teams” heading (pane chrome already titles the tab).

**Design gap (raised, not implemented):** Prototype `settingsVals()` **hides**
the Teams tab when `!caps().team_members` — there is no locked empty state in
`PostQueen App v2.dc.html`. Repo keeps the tab + inline lock (owner earlier
same day). CTA wording matches design rail `upgradeCta: 'Upgrade plan'`. Do
**not** say “Upgrade to Pro” — seats unlock at **Growth** (`pricing.ts`).

**i18n:** +`unlock_team_members`, +`upgrade_plan` (baseline `--update` when
running the migration check).

### Settings Upgrade plan left scrim open (2026-08-06)

**Cause:** Settings is `@modal/(.)settings`. `TeamsUpgradeLock` used
`<Link href="/billing">` — page slot became Plans, intercepting overlay stayed.

**Fix:** CTA dismisses like the X (`onClose` / `router.back()`), then
`queueMicrotask` → `router.push('/billing')`. Same for `?tab=billing` /
`plan_invoices` redirect. `onClose` wired through `TeamsComponent` 402 lock too.

### Add Channel — remove title chevron (2026-08-06)

**Problem:** Platform-grid / Connect myself / Invite-by-link header showed a
left chevron beside “Add a channel”. Design `platform-grid` has title +
subtitle only; back belongs on nested connect / continue steps.

**Prior partial fix:** `onStepChange` hid the title chevron only while a
provider connect step was open (double-back on connect). Chevron still
appeared on the primary Add Channel surface.

**Fix (LOOK only):** Drop the title-row chevron and `closeAdd` from Channels;
remove unused `providerStepOpen` / `onStepChange` plumbing. Nested
“All platforms” pills and invite-card “Back” in `AddProviderComponent` stay
(design `connect-step` / invite). Phone drawer Back via
`TwoColumnDetailDrawer` stays. Closing Add Channel: pick a channel in the
list, or mobile drawer Back / scrim.

### Copilot inset + Generate video always visible (2026-08-06)

**Owner:** Copilot composer felt edge-flush; Generate video vanished when
`/media/video-options` was empty (no provider keys).

**LOOK (intentional vs design 24px):** `.copilotKitInputContainer` side padding
**24 → 40** desktop; mobile (`[data-mobile=1]`) stays **24**. Empty-thread hero
aligned to 40 / 24. `max-w-[840px]` unchanged.

**WORK:** `AiVideo` no longer `return null` on empty/loading-empty options.
Still mounted only under `tier.ai` (Create Post + Copilot via
`media.component`). Empty options → disabled chrome + toast
`video_providers_are_not_configured`; generate handlers / credits /
`generate_videos` quota untouched.

**Raise:** installs without video provider keys show a muted control until
configured — better than invisible.

**Checks:** `scripts/ui-migration-check.sh --update` then plain check — **PASS**.
i18n **1317** (+`video_providers_are_not_configured`). api 155 · routes 30 · gates 14 unchanged.

### Channels right-pane layout shift (2026-08-06)

**Problem:** Opening/closing Add Channel (or a provider connect step) moved the
right-pane origin — “Add a channel” / headers no longer aligned with the prior
panel.

**Cause:** Design Channels column (`:1719`) uses
`overflow-y:scroll; scrollbar-gutter:stable` and resets `scrollTop` when
`chAdd` / `addStep` / `addContinue` change. Our `TwoColumnDetailDrawer` desktop
path had neither overflow nor a stable gutter, so scrollbar appear/disappear
and retained scroll offset shifted the centered `max-w-[760px]` column.

**Fix (LOOK only):**
- Drawer: `min-h-0 overflow-y-auto [scrollbar-gutter:stable]` (desktop + phone
  scroll body); optional `scrollResetKey` → `scrollTop = 0`.
- Channels: `scrollResetKey` from add vs detail + provider step; wire
  `AddProviderComponent.onStepChange` for connect-step resets only (no title
  chevron).

### Media drop zone dashed border softened (2026-08-06)

**Owner:** Idle dashed edge (`border-pqBrand/40`) read bright/jagged on dark.

**Fix:** Idle `border-pqBorder`; hover still `border-pqBrand` + `bg-pqBrandSoft`.
Dashed drop-zone language unchanged (`media.box.tsx`).

### Day view → Posts list template (2026-08-06)

**Owner:** Day still felt like left timeline + narrow chips; wanted Posts look
with hours between.

**Fix:** `DayView` uses Posts `max-w-[860]` column; per-hour headers (date-row
pattern); `ListItem` cards (+ drag wrapper); full-width Add / Date passed rows.
Compose-from-hour + `PUT /posts/:id/date` drop kept. Week/Month unchanged.
Supersedes centered 700px timeline; prototype left gutter / compact day cards
are intentional outs.

### Select a Set modal restyle (2026-08-06)

**Owner:** Legacy `tableBorder` / duplicate heading looked off-brand.

**Fix:** `SetSelectionModal` — list rows as `pqPop` + inset border (Channels/Posts
density); drop duplicate body title (chrome already says Select a Set); footer
secondary **Continue without set**. Handlers unchanged.

### Channels detail chrome trim (2026-08-06)

**Owner:** Publishing options / Time slots header buttons redundant; New post
should sit right of identity; Published green card strained the eye.

**Fix:** Removed those two buttons (`openPublishing` gone). Identity left +
New post / Reconnect / ⋮ right; Bot name stays secondary when needed. Time
slots via ⋮; publishing accordion still below. Published count card neutral
like Scheduled/Drafts (ok accent dot kept). Design chrome buttons = owner out.

### Remaining UI audit — mobile Channels + deferred leftovers (2026-08-06)

**Channels detail @phone:** Identity + New post + Reconnect + ⋮ was one
non-wrapping row and crowded the drawer. Now `mobile` stacks: identity + ⋮ on
row 1; full-width New post (+ Reconnect) on row 2. Desktop unchanged (identity
left / CTAs right).

**Responsive smoke (code + layout review):** Day `max-w-[860]` list fills phone;
Teams lock full-width; Copilot `[data-mobile]` 24px inset; Settings Upgrade
dismisses scrim then `/billing`. Soft outs kept: week @420 clip, compose footer
@420 crowding.

**i18n baseline `--update`:** dropped unused `choose_set_or_continue`,
`publishing_options`, `time_slots` (chrome removed; accordion still uses
`n_publishing_options` / `edit_time_slots`). Check PASS — i18n **1314**.

**Deferred (optional later, not this pass):**
- Milestone 7 billing photo matrix when `billingEnabled` on install
- Milestone 10 admin + error page restyle

### Settings leave (Upgrade / Connections) only closed scrim (2026-08-06)

**Cause:** `router.back()` + `queueMicrotask(push)` raced — Settings closed,
destination never opened.

**Fix:** Shared `leaveSettingsFor()` — while `[data-settings-scrim]` is present,
`window.location.assign(path)` (clears `@modal/(.)settings`). Used by Teams
Upgrade, Open Connections, and `?tab=` redirects.



### AGENCY commercial label → Ultimate (2026-08-06)

Live top-tier **identifier** stays `AGENCY` (Prisma enum, Stripe metadata/lookup_keys,
lifetime ladder, DTO). Commercial **label** is `Ultimate` via `pricing.AGENCY.label`
and `tierLabel()` — billing cards, checkout, plan & invoices, LOOK toolbar, etc.

Retired `ULTIMATE` pricing row is unchanged (100 channels / $950 yearly). Do not
rename the enum key to `ULTIMATE`; that would collide with legacy rows.

**Org rail switcher polish:** single-org row is always a clickable switcher
(switch icon + chevron + menu); left letter badge replaced with switch arrows.
i18n: `switch_organization` (aria-label).

**Teams LOOK unlock:** DEV billing override + `team_members` treats GET `/settings/team` 402 as empty list (not lock). Gates baseline recount (`tier.team_members` call sites).

### Checkout columns + pay bar + Lifetime default (2026-08-06)

**Owner:** Plan / order summary on the **left**; FAQ under payment on the **right**;
fixed bottom pay bar for every selection (not only Lifetime); open with Lifetime
selected when the founding window is open.

**Fixes** (`first.billing.component.tsx`): swapped columns; FAQ moved with payment;
`checkoutMode` defaults to `lifetime` (`activeMode` falls back to subscription when
the window is closed); marketing `selectedPlan` still forces subscription; parent
`SubmitBarFallback` when Embedded Stripe chrome is not live so the bar survives
load/error states. Design prototype also keeps a always-on bottom bar.

**Checks:** `scripts/ui-migration-check.sh --update` — gates `allowTrial` 34→36
(parent `SubmitBarFallback` + `fallbackAllowTrial` usage); api/i18n/routes unchanged.

### CopilotKit Network CombinedError without OPENAI (2026-08-06)

Empty `OPENAI_API_KEY` made `/copilot/chat` return plain 503 JSON; CopilotKit's
mount-time `availableAgents()` became `CombinedError: [Network] Unknown error
occurred`, and Next canary overlaid it on every authenticated page.

**Fix:** `isAiEnabled()` + `aiEnabled` on VariableContext (same pattern as
`billingEnabled`). Layout and preview mount `<CopilotKit>` only when enabled;
editor / pick-platform Copilot hooks live in child components gated the same way;
signatures / plugs / autopost fall back to plain `<textarea>`; Agents shows an
empty state. i18n: `ai_not_configured_title`, `ai_not_configured_body`. Baseline
`--update` (i18n + incidental api/gates drift from earlier settings form removal).

### Agents unconfigured shell (no blocking empty state) (2026-08-06)

**Owner:** When OpenAI is off, Agents must not center-takeover with
"AI is not configured". Show normal empty Copilot LOOK without remounting
CopilotKit against a broken `/copilot/agent` (CombinedError overlay).

**Fix:** `agent.chat.tsx` — extract presentational `EmptyStateHero` (no
`useCopilotMessagesContext`); live `EmptyState` still gates on messages/`new`.
`!aiEnabled` renders `UnconfiguredAgentShell`: same hero + **working** local
composer (type + send → user bubbles in-thread, no assistant reply / no
network). Hint under the input removed. CopilotKit stays unmounted. Channel
rail / `openChannels` unchanged. Send button: `.agent` CSS forces
`inline-grid` + `place-items: center` + 32×32 (overrides SDK
`inline-block` / 24px that left the ↑ glyph tiny in a corner).

**Checks:** `scripts/ui-migration-check.sh` — types/api/i18n/routes/gates PASS
(no baseline rewrite).

**Month chips:** platform icon (13px) then avatar — same order as Week/Day
(`calendar.tsx` `data-mpost`).

### Trial lock amber tip + shimmer CTA (2026-08-06)

**Owner:** While X (or any trial-locked provider) is locked, hide the amber
`guide.requirement` strip — connect is not open yet. Unlock CTA should bloom /
glow / sheen like the design AI Copilot lock button.

**Fix:** `ProviderSetupStep` shows requirement only when `!locked`.
`TrialLockCard` primary CTA uses `animate-pqBtnBloom` / `Glow` / `Sheen` +
`pq-loop` (keyframes already in `global.scss`).

### Trial lock: no padlock on Add-channel tile (2026-08-06)

**Owner:** Lock badge on the X (trial-locked) tile in the SOCIAL grid looked
wrong — user should only see the lock when they open the channel.

**Fix:** Removed the absolute padlock overlay from the provider tile. Tile stays
clickable (`data-provider-trial-locked` kept); `ProviderSetupStep` still shows
`TrialLock` / `TrialLockCard` when `trialLocked && isTrailing`.

### Checkout layout correction + pay bar label + scroll (2026-08-06)

**Owner:** FAQ right under pricing — not all pricing moved left. Order summary
only under payment on the left. Page must scroll; bottom CTA must show label.

**Fix:** Columns restored (left: hero + payment + order summary; right: plans +
FAQ). Paywall root `min-h-0 overflow-y-auto` inside shell `h-dvh`.
`SubmitBarFallback` takes `pending` — error/idle keeps CTA text visible (was
blank purple from perpetual `loading` + `invisible` children). Lifetime bar
interpolation uses `{{amount}}` with `$49` to avoid `${{price}}` i18n quirks.

### Checkout fidelity pass (coupon / trust / dimming / spinner) (2026-08-06)

**Why it looked wrong:** An earlier fidelity plan was written but never
shipped while other multitask work ran. Gaps matched the screenshots —
no usable coupon on yearly/lifetime/error, `opacity-55` on Choose a plan
when Lifetime selected, Stripe trust only under live Payment details,
`ReactLoading` border shorthand overlay.

**Shipped (LOOK + small WORK):**
- `button.tsx` — longhand borders only (no Router/style overlay on pay bar)
- Removed subscribe `opacity-55` when Lifetime selected
- Coupon chrome always on order summaries (subscription live `CouponInput`,
  fallbacks + lifetime `CouponChrome`); `allow_promotion_codes: true` for
  monthly **and** yearly Embedded/hosted + lifetime Checkout
- Shared `StripeTrust` under summaries and on pay-bar **left** (owner trust
  override; design bar left was empty)
- Lapsed/`!allowTrial`: still no trial credit; coupon + trust remain; CTAs
  unchanged

**Raise (unchanged):** Design Lifetime `$0` today / charge after trial needs
deferred SetupIntent + trial-end PaymentIntent — not in this pass. Lifetime
summary stays honest `$49` due today.

**Checks:** `scripts/ui-migration-check.sh --update` — types/api/routes/gates
ok; i18n baseline refreshed for `billing_coupon_when_checkout_ready` /
`billing_coupon_on_stripe_checkout` (new) and removed
`ai_not_configured_*` (Agents unconfigured shell earlier same day).

### Toast vs bell notifications (2026-08-06)

**Owner:** Schedule / draft / publish-intent while present → bottom-right toast,
no bell. Async (Temporal publish, etc.) while focused → toast + auto-read so
badge stays clear. Offline async → bell unread as today.

**Shipped:**
- `toaster.tsx` — bottom-end position; `show(text, type?)` kept; optional
  `{ title, kind: success|warning|info, duration }` for reuse
- Compose (`manage.modal.tsx`) toasts: Saved as draft / Scheduled for … /
  Publishing now… (no `inAppNotification` from those paths)
- `NotificationsLiveBridge` — poll list while visible (~20s + focus); toast
  rows newer than session start; `POST /notifications/read` + clear badge SWR.
  Pre-session unread still badge until bell open
- Drag schedule / move-to-drafts toasts unchanged (already client-only)

**Out of scope:** websockets, per-row read flags, email digest.

**Checks:** `scripts/ui-migration-check.sh --update` — i18n adds
`saved_as_draft`, `publishing_now` (compose toasts).

### Header chrome polish (2026-08-06)

**Owner:** Top-right uneven gaps/dividers; name too bold; Create Post chevron
seam too harsh (bright slash on brand).

**Fix:** End cluster wrapped with even `gap-[10px]`; single hairline before
UserMenu (no divider inside streak/help/bell strip). Header name
`font-[500]`. Create Post pill `rounded-[10px]`, no `border-s` on chevron —
shared hover wash instead.

### Settings inline form density (2026-08-06)

**Owner:** Edit Autopost (and sibling Settings panes) wasted vertical space —
full-width Yes/No selects, broken-looking native chevron, empty error
spacers, forced scroll. Not required to match prototype 1:1.

**Fix:**
- Shared `Select`: `appearance-none` + SVG chevron; no empty error row
- New `FormChoice` segmented pills for short Yes/No (and schedule) options
- Autopost / signatures use `FormChoice`; webhooks/teams denser selects
- Input denser (h40, label 13px); drop reserved `&nbsp;` error spacer
- SettingsPaneEditor + ModalFormActions tighter gaps/heights

**Checks:** `scripts/ui-migration-check.sh` (no new i18n/API surface).

### Integrations SWR shape crash (2026-08-06)

**Symptom:** Next overlay `TypeError: integrations is not iterable` on
`/agents` at `sortIntegrationsByProviderImportance` ← `AgentList`.

**Root cause:** SWR cache key `'integrations'` was shared with incompatible
shapes. Webhooks + Autopost fetchers stored the full JSON
`{ integrations: [...] }`. AgentList expected a bare array and did
`data || []` — a truthy object still spread-crashes. Plugs also reused
`analytics-list` (analytics-filtered) for the full channel list.

**Shipped:**
- `sort.integrations.ts` — accept `T[] | null | undefined`; non-arrays → `[]`
- `use.integration.list.tsx` — `Array.isArray` before sort
- AgentList / Webhooks / Autopost / Plugs → `useIntegrationList()` (shared
  `/integrations/list` array cache); drop colliding `'integrations'` /
  wrong `analytics-list` usage
- Analytics sort + agent.chat selectable list + onboarding list fetcher
  hardened

**Deferred:** `'sets'` shared by calendar + Settings Sets (same endpoint —
  low risk). Accidental `*.js` / `*.js.map` build artifacts untracked —
  ignore.

**Checks:** `scripts/ui-migration-check.sh` — PASS (types/api/i18n/routes/gates).

### Checkout composition polish (2026-08-06)

**Owner:** Edge-to-edge felt wrong; order summary belonged bottom-right (not
under payment); FAQ left; plan/payment radios too faint; pay CTA looked
disabled/washed when payment details empty — prefer full brand + click error.

**Layout (`first.billing.component.tsx`):** Content + pay bars constrained to
`max-w-[1120px] mx-auto` with side padding. **Left:** hero + Payment details +
FAQ. **Right (sticky):** Lifetime / Choose a plan + **Order summary** at foot
(`#pq-order-summary` portal). Mobile still `flex-col-reverse` (plans first).

**Radios:** Shared `CheckoutRadio` — unselected `ring-2` on `pqMuted` /
`pqLtDim`; selected brand/lifetime fill + soft outer ring. Stripe Elements
appearance: stronger `.RadioIconOuter` / `.Tab` borders + `colorPrimary`
(hex mirrors tokens — iframe exception).

**CTA:** `SubmitBarFallback` no longer `disabled`/`loading` (was `opacity-50`).
Full brand; click toasts `billing_complete_payment_details`. Live `SubmitBar`
keeps full opacity while processing (`!opacity-100`, label swap). Lifetime bar
drops `disabled:opacity-60`.

**Error chrome:** Nest “Internal server error” in Payment details mapped to
friendly copy (`friendlyCheckoutError` + Stripe session status) — no Stripe
backend inventing.

**Left alone (WORK):** Prices, lifetime $49 honesty, Embedded/hosted Stripe
flows, coupon allow flags, trial credit math.

**Raise (unchanged):** Design Lifetime `$0` today / charge-after-trial needs
deferred SetupIntent — not this pass.

**Checks:** `scripts/ui-migration-check.sh --update` — PASS (types 0/0;
api 154; i18n 1335 incl. `billing_complete_payment_details` /
`billing_processing`; routes 30; gates 14).

### Create Post compose polish (2026-08-06)

**Owner:** Toolbar cramped; “Add post in a thread” wording doubtful; platform
settings full-bleed; Claude/ChatGPT area odd; show AI section when OpenAI off;
document what compose AI actually does.

**AI WORK (evidence — keep copy honest):**
- `CopilotPopup` + `EditorCopilotBindings.setPosts` — **text only**: read/rewrite
  thread contents; cannot generate images/video via the chat.
- Empty-editor Claude/ChatGPT pills — **deep-link LOOK only** → `/connections`
  (MCP / agents). Do not invent an in-compose Claude write API.
- `AiImage` / `AiVideo` toolbar — separate, `tier.ai` gated; media generation
  endpoints. Polonto Design Media is separate.

**Thread control label:** `add_post` **Add post in a thread** → **Continue
thread**. WORK: `PostComment.POST` (X/Threads/Bluesky/…) publishes the next
item as a reply chaining the thread (`in_reply_to` / equivalent). Not a
public “comment” metaphor. `PostComment.COMMENT` stays **Add comment**.
`add_comment_or_post` → **Add another post**. Raise if product wants a single
generic label across both APIs.

**Shipped (LOOK; handlers untouched):**
- Toolbar: 36px hit targets, `pqBtnSimple`, media vs format groups + divider,
  wrap — `media.component`, signature/bold/underline/emoji/link/bullets/heading,
  third-party + AI image/video chips
- Settings: contained card shell in `manage.modal` + portal cards in
  `high.order.provider` (inset ring, padding; all fields still reachable)
- AI banner reframed (“AI writing help” + Connections CTA); unconfigured FAB
  shell → `/connections` (no CopilotKit mount when `!aiEnabled`)
- Copilot labels/instructions: text-only honesty

**Raise / deferred:** Design in-sheet AI FAB vs CopilotPopup (composer.md R1);
provider field internals; screenshot matrix @ 420/900/1440; non-en locale
string refresh beyond `en`/`tr` for thread label.

**Checks:** `scripts/ui-migration-check.sh --update` (new i18n keys).

---

### Modal open layout jump (Create Post) (2026-08-06)

**Symptom:** Clicking Create Post (and any `openModal`) made the background
chrome jump left for a frame.

**Cause:** `ModalManagerInner` applied `scrollbar-gutter: stable` only while
`.pq-modal-open` was set. Our shell is mostly `h-dvh` + inner scroll, and macOS
often uses overlay scrollbars — so opening a modal *introduced* a gutter and
narrowed the layout. Same path for every ModalManager modal (media, AI image,
confirm dialogs, nested Settings forms, etc.).

**Fix:** `scrollbar-gutter: stable` always on `html` (`global.scss`); modal open
only locks `overflow: hidden`.

### Agents composer toolbar + send size (2026-08-06)

**Symptom:** Insert media / Design / AI chips missing under the Copilot input;
send looked tiny (SDK 24px).

**Cause:** `MediaPortal` waited for `.copilotKitMessages` before rendering —
that class only exists on the live CopilotKit tree, so the OpenAI-off
`UnconfiguredAgentShell` never got the toolbar (and mount races could hide it
even when AI was on). Shell also omitted `MediaPortal` entirely.

**Fix:** Drop the wait gate; wire thumbs + toolbar into the unconfigured
shell; send control → 40×40 brand square (hard override of SDK 24px).

### Checkout widen + founding deal always visible (2026-08-06)

**Owner:** Checkout felt cramped in a narrow center with empty side margins;
Founding member card missing; “Included in …” features in a two-column grid
wrapped awkwardly.

**Fix:**
- Shell `max-w` 1120 → **1360**; right column ~520px; pay bars match
- `BillingFeatures` back to **single column** (no 2-col wrap)
- Founding Lifetime card always shown on First Billing while `!isLifetime`
  (24h window only drives countdown; closed → “Founding price” chip). Backend
  already accepts lifetime checkout without a window check.

---

## Connections catalog redesign — 2026-08-06

Owner priority: redesign `/connections` for look + docs accuracy. Not a 1:1
prototype pass — take initiative; do not invent features.

### Before

`connections.component.tsx` was a **17-card** catalog in 5 groups
(Assistants · Coding agents · Chat with your agent · Automation · Build on
PostQueen). Two lumps violated the owner brief:

- **`editors`** — Cursor, VS Code, Windsurf, Warp, Amp in one card
- **`chat-bridge`** — WhatsApp, Slack, Discord, Telegram in one card

Card tint colours were per-item hex literals. Docs deep-links were sparse
(OpenClaw / chat bridge only). Amp had no docs page. VS Code had no dedicated
MCP guide.

### After — IA (7 sections, **28 cards**)

| Section | Cards |
| --- | --- |
| **Agents** | OpenClaw, Hermes (hero) |
| **Chat front doors** | WhatsApp, Telegram, Slack, Discord — each separate; labeled CHAT, not publishing |
| **Assistants** | Claude Desktop, Claude Web & Mobile, ChatGPT, Claude Code, Cursor, Codex, Gemini CLI — one card per dedicated docs page; MCP / CLI skill CTAs where docs document both |
| **More MCP clients** | Warp, Cline, Windsurf, Any MCP client (streamable HTTP) |
| **Automation** | n8n, Zapier (SOON), Make (SOON), Webhooks, RSS AutoPost |
| **CLI & API** | CLI, Public API, Node SDK, OAuth apps |
| **Media** | HeyGen, Reel.Farm |

Publishing channels stay under Channels / Add Channel (not duplicated here).

### LOOK

- Section blurbs + filter chips (All / each section) + search
- Denser auto-fill grid (`minmax(260px,1fr)`), wider page (`max-w-[1100px]`)
- Brand icons from docs mintcdn → `apps/frontend/public/icons/connections/*.svg`
  (plus existing `/icons/third-party/{heygen,reelfarm}.png`)
- Kind badges: AGENT · CHAT · MCP · SKILL · FLOW · API · MEDIA (token soft fills)
- Card + detail CTAs deep-link to `https://docs.postqueen.ai/…`
- Prompt hero gradient uses `--brand*` tokens (no per-card hex tint)
- Gate unchanged: `tier.public_api` + `isGeneral` + ADMIN/SUPERADMIN
- Tour hooks preserved: `data-tour="connections-page"`, `data-conn-card`,
  `data-connector`

### Docs URLs (card → primary)

- OpenClaw → `/agents/openclaw`
- Hermes → `/agents/hermes`
- WhatsApp / Telegram / Slack / Discord → `/agents/chat-channels#…`
- Claude Desktop → `/mcp/clients/claude-desktop` (+ `/agents/claude-apps` hub)
- Claude Web & Mobile → `/mcp/clients/claude-app` (+ `/agents/claude-apps` hub)
- ChatGPT → `/agents/chatgpt` (+ `/mcp/clients/chatgpt`)
- Claude Code → `/agents/claude-code` (+ `/mcp/clients/claude-code`, skill)
- Cursor → `/agents/cursor` (+ `/mcp/clients/cursor`, CLI)
- Codex → `/agents/codex` (+ `/mcp/clients/codex`, skill)
- Gemini CLI → `/agents/gemini-cli` (+ `/mcp/clients/gemini-cli`)
- Warp / Cline / Windsurf → `/mcp/clients/other-clients#…`
- Any MCP client → `/mcp/clients/other-clients`
- n8n / Zapier / Make / Webhooks / RSS → `/automation/…`
- CLI → `/cli/introduction` · API → `/public-api/introduction` · SDK →
  `/public-api/sdk` · OAuth → `/public-api/oauth`
- HeyGen / Reel.Farm → `/using/third-party-integrations`

Setup steps stay install-local (this install's `backendUrl` + API key). OpenClaw
/ Hermes / chat front doors use **Agent Skills** only
(`npx skills add GkhanKINAY/postqueen-agent`) — no invented `openclaw mcp add`.

### Raises

1. **Amp** — was in the old editors lump; **no docs page** and no other WORK —
   dropped. Re-add only if docs land.
2. **VS Code / Zed / Continue** — no dedicated MCP pages; covered by **Any MCP
   client** (streamable HTTP) with an honest note. Do not invent a VS Code card.
3. **Claude Desktop vs Claude Web & Mobile** — **resolved 2026-08-06 (follow-up):**
   owner wants maximum separate cards. Split into two MCP cards mirroring
   dedicated docs pages (`/mcp/clients/claude-desktop`, `/mcp/clients/claude-app`);
   `/agents/claude-apps` hub linked on both. Still no Amp / VS Code cards.
4. **Screenshot matrix** — not run here (needs `PQ_AUTH` + local app).

### Checks

`scripts/ui-migration-check.sh --update` — **intentional i18n move** for the
expanded catalog (lump keys removed: `conn_editors_*`, `conn_bridge_{name,short,
intro,link,step_*}`, `conn_group_chat`, `conn_group_coding`, `conn_openclaw_link`,
later `conn_claude_apps_name` / shared `conn_claude_*` / `conn_path_mcp_{desktop,web}`;
new keys for per-card copy, section blurbs, docs/path CTAs, filters, then
`conn_claude_desktop_*` + `conn_claude_app_*`).

- types (frontend) 0 · types (backend) 0
- api 154 unchanged
- routes 30 unchanged
- gates 14 unchanged
- i18n **1326 → 1429** (+123 / −20), then Claude split **1429 → 1439**
  (`--update`; see follow-up below)

### Files

- `apps/frontend/src/components/public-api/connections.component.tsx`
- `apps/frontend/public/icons/connections/*.svg` (16 brand icons)
- `docs/ui-migration-baseline/i18n.txt`
- `docs/ui-migration-log.md` (this entry)

---

## Connections — Claude Desktop / Web & Mobile split — 2026-08-06

Owner follow-up on Raise #3: maximum separate cards. Replaced the single
**Claude Apps** card with two MCP cards mirroring dedicated docs:

1. **Claude Desktop** → `/mcp/clients/claude-desktop` (+ hub `/agents/claude-apps`)
2. **Claude Web & Mobile** → `/mcp/clients/claude-app` (+ hub)

Verified still separate (no re-lumping): WhatsApp, Telegram, Slack, Discord;
Cursor; Warp, Cline, Windsurf. No Amp / VS Code cards invented.

Catalog now **28 cards**. Gate / SOON unchanged.

**Checks:** `scripts/ui-migration-check.sh --update` — types 0/0, api 154,
routes 30, gates 14 unchanged; i18n **1429 → 1439**.

---

## Connections — visual polish (merge Claude + logos) — 2026-08-06

Owner feedback on noisy tiles / tiny logos / duplicate Claude cards:

### LOOK

- **ConnIcon:** drop filled `bg-pqSettings` chrome when an SVG exists; list
  ~40px, hero ~50px, detail ~60px. Glyph-only fallback keeps a soft tile + ring.
- **Claude Code** icon → shared orange `/icons/connections/claude.svg` (no
  purple nested frame).
- **Claude Desktop + Web & Mobile** merged back into one **Claude** card
  (`id: claude-apps`). Detail keeps both MCP docs + apps hub; steps cover
  Desktop and claude.ai / mobile.
- List cards: more padding, softer kind badge (`bg-pqBtnSimple` / `text-pqSoft`),
  at most one path chip + Docs on the face (dual MCP/Skill CTAs stay in detail).

Catalog **28 → 27**. Gate / SOON / chat+IDE separation unchanged. No Amp /
VS Code cards.

### Checks

`scripts/ui-migration-check.sh --update` — types 0/0, api 154, routes 30,
gates 14 unchanged; i18n **1439 → 1432** (retire `conn_claude_desktop_*` /
`conn_claude_app_*`; restore `conn_claude_apps_*`).

### Files

- `apps/frontend/src/components/public-api/connections.component.tsx`
- `docs/ui-migration-baseline/i18n.txt`
- `docs/ui-migration-log.md` (this entry)

---

## Lifetime deal — 7-day trial copy + deferred $49 (2026-08-06)

**Raise resolved:** Checkout previously kept honest **$49 due today** because
hosted Checkout `mode: 'payment'` charged immediately. Design/owner want every
package including Lifetime to show **$0 due today** with charge after the
7-day trial — shipping that copy alone would have been false advertising.

### LOOK

`LifetimeOrderSummary` + `LifetimePayBar` gate on `user.allowTrial` (same as
subscription):

| | Trial (`allowTrial`) | Lapsed (`!allowTrial`) |
|---|---|---|
| Due today | `$0.00` | `$49.00` |
| Then | `$49 once on {trialEnd}` | One payment of $49 |
| CTA | Pay $0 Today – Start your free trial! | Get lifetime access — $49 once |

Trial end date reuses `trialWindow(createdAt)` / `TRIAL_DAYS` — not a second clock.

### WORK

- `createLifetimeCheckout`: `mode: 'setup'` + `lifetime_deferred: '1'` when
  `allowTrial`; else keep immediate `mode: 'payment'`.
- Webhook `checkout.session.completed` setup branch →
  `completeDeferredLifetimeSetup` (default PM + `grantLifetimeFromPayment` with
  `lifetime-setup:{sessionId}`; still trialing).
- `captureFoundingLifetimeIfDue`: off-session PaymentIntent for `LIFETIME_PRICE`
  once; idempotent via `lifetime-charge:{piId}` + skip if already `cs_*`.
- `POST /billing/finish-trial` force-captures before local `endTrial`.
- `GET /billing/is-trial-finished` lazy-captures when `trialWindow` closed.

### Files

- `apps/frontend/src/components/billing/first.billing.component.tsx`
- `libraries/nestjs-libraries/src/services/stripe.service.ts`
- `libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.{service,repository}.ts`
- `apps/backend/src/api/routes/stripe.controller.ts`
- `apps/backend/src/api/routes/billing.controller.ts`

### Checks

`scripts/ui-migration-check.sh --update` PASS — types 0/0; api 154, routes 30,
gates 14 unchanged; i18n **1432 → 1451** (lifetime trial copy keys:
`billing_lifetime_then_after_trial`, `billing_zero_due_today_until`,
`billing_founding_bar_sub_trial`, `billing_pay_0_start_trial`, etc.).

### Posts list filter toolbar containment (2026-08-06)

Owner: Posts list filters pinned to far left/right of the page while cards sit in
the centred `max-w-[860px]` column (unlike Media).

**Fix:** `filters.tsx` — for `list` and `day` (same content column as cards),
toolbar uses `mx-auto max-w-[860px] px-[4px]` matching `ListView`/`DayView`.
Week/Month stay full-bleed with their grids. Pattern mirrors Media
(`media.box.tsx` standalone: `mx-auto max-w-[980px]` wrapping toolbar + grid).
Handlers unchanged.

**Superseded (same day):** Owner then wanted All dates / calendar·list icons on
the content edges (860 gutters felt like padding). Dropped `max-w-[860]` for
list + day — toolbar and cards fill the launches `p-[20px]` pane together.
Week/Month unchanged. Shell pad stays; header title still outside that pad.

**RAISE:** Reading-column width for list/day removed (was intentional Day≈Posts
LOOK).

**Reverted (same day, owner):** Full-bleed was not requested — restore
`max-w-[860]` containment for list + day. Also enrich All dates with
**Pick a date…** (Mantine `Calendar` → `listRange` `day:YYYY-MM-DD`) and
prev/next when a day is selected. Design RANGES have no picker — owner raise;
list filter remains client-side on `/posts/list`.


---

### Compose thread button label (2026-08-06)

**Owner:** Global-edit coral button labeled **Add another post** is misleading —
WORK appends a thread/comment segment under the current compose thread, not a
separate new post.

**Design (authoritative LOOK):** `PostQueen App v2.dc.html` compose template
~L644 — **Add comment or post** (`onClick="{{addComment}}"` → appends
`composeComments`). Calendar cell **Add post** (~L1504) is unrelated.

**Fix (copy only):** `add_comment_or_post` English fallback + `en`/`tr` locale
strings **Add another post** → **Add comment or post** (design). Key unchanged;
`PostComment.POST` / `COMMENT` labels (**Continue thread** / **Add comment**)
untouched. Handler still `AddPostButton` → `addValue`. Corrects the earlier
compose-polish raise that shipped the wrong ALL-mode label.

### Billing plan-card CTAs: Purchase → Upgrade / Downgrade / Switch (2026-08-06)

Owner: Plans cards said **Purchase** on every non-current tier during a Pro
trial; design had Upgrade / Downgrade / Switch.

**Design source:** `pagesVals()` → `plans` CTA (~L8056–8057) in
`design/handoff/design/PostQueen App v2.dc.html` (prototype outranks handoff
markdown). Matrix:

| Condition | Label |
| --- | --- |
| Same tier + same period | Current plan |
| Lifetime on that tier | Current plan · lifetime |
| Same tier + period toggle mismatch | Switch to yearly / Switch to monthly |
| Higher price at viewed period | Upgrade to {name} |
| Lower price at viewed period | Downgrade to {name} |
| FREE (canceling) | Downgrade on {date} (repo WORK) / Cancel subscription |
| FREE org + allowTrial | Start 7 days free trial |
| FREE org, no trial | Purchase |

**Fix:** `planCardCta()` in `main.billing.component.tsx` — labels only;
`moveToCheckout` unchanged. Plan name in Upgrade/Downgrade uses `tierLabel`
(Creator / Growth / Pro / Ultimate) so AGENCY matches the card title; prototype
used the raw key.

**Raise — Pay Today:** Design fakes prorate (`(diff * 0.5).toFixed(1)`); repo
keeps real `POST /billing/prorate` + `(Pay Today $X)`. Owner focused on CTA
verbs; left WORK as-is. Design also shows "Renews {date}" on the current card;
Stripe renewal date is not in local state — empty spacer stays.

**First billing / checkout CTAs untouched.** Lifetime card CTA unchanged.

**Checks:** `scripts/ui-migration-check.sh --update` PASS — types 0/0; api 154,
routes 30, gates 14 unchanged; i18n **1451 → 1455** (`upgrade_to_plan`,
`downgrade_to_plan`, `switch_to_yearly`, `switch_to_monthly`; `purchase` en
locale filled to match the existing t() key).

---

## Lapsed checkout — “Your trial ended on {date}” (2026-08-06)

**Raise resolved:** First Billing amber strip was dateless (“Your subscription
ended.”) because the Subscription row is hard-deleted — no `cancelAt` on the
client. Owner + design want the trial end date.

**LOOK:** When `!allowTrial`, title uses `trialWindow(createdAt).endsAt` formatted
`D MMM, YYYY` → `Your trial ended on {{date}}.` (`billing_trial_ended_on`).
Missing `createdAt` keeps the dateless fallback. Body unchanged.

**Raise (unchanged):** A paid-then-cancelled FREE org would still show the
*trial* end (createdAt+7), not Stripe cancel day — needs `cancel_at` later if
product cares.

**File:** `apps/frontend/src/components/billing/first.billing.component.tsx`

**Checks:** `scripts/ui-migration-check.sh --update` PASS — i18n **1455 → 1456**
(`billing_trial_ended_on`).

---

## Checkout Help menu inventory (2026-08-06)

**Owner:** Checkout Help showed Setup tour + locked Keyboard shortcuts; Report a
bug was missing from the menu.

**Why Report a bug was missing:** row is gated on `sentryDsn`. Separately, the
Help menu mounts the Sentry button only while open — `useRef` + attach-on-mount
never re-attached, so even with a DSN the menu row could be dead while the
standalone header icon worked. Fixed with a callback ref.

**LOOK:** `HelpMenu surface="checkout"` — Documentation · Contact support ·
Report a bug. No Setup tour, no Keyboard shortcuts, no extension row.
Standalone `AttachToFeedbackIcon` removed from checkout header (Help owns it).

**Files:** `help.menu.tsx`, `sentry.feedback.component.tsx`,
`first.billing.component.tsx`

---

## Checkout Pro Popular badge — temporarily off (2026-08-06)

While the founding-member deal steers First Billing, hide the Pro **Popular**
pill so Lifetime is the only checkout steer. Flip
`SHOW_PRO_POPULAR_BADGE` in `first.billing.component.tsx` when the deal retires.
`/billing` Plans “Most popular” unchanged. i18n key `billing_popular` kept.

---

## Lapsed banner icon + copy fidelity (2026-08-06)

**Owner:** filled warn-disc `!` looked bad; “Nothing will go out…” is weak English.

**Prototype check:** paywall template renders **title only** (`pwLapsedTitle`) with
an 18×18 **stroke** warn circle. `pwLapsedBody` sits in Vals but is unused in
that template — shipping it was a LOOK mistake.

**Fix** (`first.billing.component.tsx`): stroke icon + `ring-pqAmberLine`; drop
body line. Keep trial date title via `trialWindow`.

---

## Edit Post — restore Global + channel tabs (2026-08-06)

Edit hid `SelectCurrent` behind `!existingData.integration`, so only the
Select channels picker showed — no Global / per-channel editor switcher.
Always render `SelectCurrent` again (same as Create). Handlers unchanged.

---

## Calendar & Posts bug audit fixes (2026-08-06)

**P0:** Draft → calendar `changeDate(schedule)` called `startWorkflow` with the
*old* DRAFT state → Temporal no-op. Always pass `QUEUE` after schedule.

**P1:** Posts list status segment (Scheduled/Drafts/Posted) — panel is unmounted
on list. Drafts API allows any `publishDate` (past drafts visible). List
pagination uses server `total` even with client channel/range filters. Hide
Past-only under Scheduled.

**P2:** Drop success = `res.ok` (2xx); week/month `useDrop` deps include
`isBeforeNow`; Day hour pastness ticks every minute; month drop at noon;
`openAtMorning` uses `[data-cal-hour]="7"`; Newest sorts day headers desc.

---

## Checkout width — use more horizontal space (2026-08-06)

Owner: checkout felt dense while wide screens left empty side margins.
`CHECKOUT_MAX` **1360 → 1600px** (header / body / pay bar stay aligned); desktop
column gap **48 → 56px**. Right column still `min(520px, 42%)` — plans stay 2×2.

---

## Checkout Monthly/Yearly contrast + plan cards (2026-08-06)

**Owner:** Monthly vs Yearly selected state invisible in dark — `--inner`
pill on `--settings` trough is *darker* than the track.

**Fix:** Inverted selected pill `bg-pqText text-pqBg shadow-pqE2` on checkout
and Plans period toggles; period state no longer requires `activeMode ===
'subscription'` (Lifetime selected used to mute both). Plan cards slightly
larger (16px pad, 26px price, 21px Choose a plan).

---

## Channels add-grid category spacing (2026-08-06)

**Owner feedback:** Category groups on Channels → Add a channel looked glued —
only ~6px (`mt-[6px]`) between the last cards of one group and the next
header.

**Fix** (`add.provider.component.tsx`): groups wrapper `gap-[24px]`; each
group `flex flex-col gap-[10px]` (label→grid matches design); label row is
uppercase title + `h-[1px] flex-1 bg-pqLine` hairline (design `var(--line)`).
Dropped `mt-[6px]` / `mb-[10px]` / `first:mt-0`. Behavior unchanged.

---

## Channels Add Channel NEW badges on Whop / Skool (2026-08-06)

**Owner feedback:** Design shows NEW corner labels on Skool and Whop tiles;
production grid only had Whop’s tooltip “?”.

**Fix:** Generic `isNew` on `SocialProvider` (set on Whop + Skool), passed
through `IntegrationManager`, rendered top-start on tiles in
`add.provider.component.tsx` (`bg-pqBrand text-pqOnBrand`, design radius /
type). Coexists with tooltip (top-end) and trial lock on icon. No
identifier hardcoding in the grid.

---

## Posts list date filter enrichment (2026-08-06)

**Owner:** “enrich” (zenginleştir) the Posts date-range dropdown (was only
All dates / Today / This week / Next 3 days on Scheduled).

**Design inventory** (`gridVals` `RANGES`): All dates, Today, This week,
Next 3 days, Past only (+ ephemeral `dayN` from calendar See all). Design
equals the previous repo set (Past only already gated off Scheduled).

**After (enriched, same `listRange` / `postInListRange` plumbing):**
- Always: All dates, Today, Tomorrow, This week, Next 3 days, Next 7 days,
  This month, Next month
- Drafts / Posted only: Yesterday, Past week, Past only
- Unchanged: `day:YYYY-MM-DD` chip from calendar See all; purple selected
  highlight; status tabs + sort

**Ranges (client-side on loaded list pages — no new API):** tomorrow /
yesterday = single day; next7 = today…today+6; month / nextMonth =
calendar month bounds; pastWeek = previous ISO week (pairs with This week).
Past-oriented presets reset to All dates when switching to Scheduled.

**RAISE:** No custom date-range picker in design or this pass. List endpoint
still has no `startDate`/`endDate` — range filters only the pages already
fetched. A true calendar picker or server-side date bounds would need a
backend param (and/or UI) if owner wants that next.

**i18n:** `tomorrow`, `yesterday`, `next_7_days`, `this_month`,
`next_month`, `past_week` (+ existing keys). English fallbacks in `t()`.

**Files:** `filters.tsx`, `calendar.context.tsx`, this log.

---

## Lifetime Order Summary declutter (2026-08-06)

**Owner feedback (TR):** Lifetime checkout Order Summary felt too dense
(plan + trial credit + coupon + due today + then + dual callout + Stripe).

**Design vs us (App v2 paywall Order summary):** Same inventory except we
had Stripe trust inside the card (design puts it under Payment details /
pay bar) and a muted second callout sentence (“Founding member…”) while
design uses one body colour + `pwCancelTail` (trial never-charged line).

**LOOK (no WORK change):**
- Outer gap 14 → 18; line items stay 14; due/then grouped at 10
- Trial label muted; green only on `-$49` amount (design)
- Callout: drop muted dual-tone; trial → `billing_cancel_notice_trial`;
  non-trial keeps `billing_lifetime_no_renewal_note` (sub “billing period”
  tail is wrong for lifetime)
- Remove `StripeTrust` from `LifetimeOrderSummary` (still on `LifetimePayBar`)
- Coupon chrome kept (design has it; WORK for hosted Checkout codes)

**Raise:** Stripe under summary was an earlier owner trust override; for
Lifetime it duplicated the pay-bar left. Confirm Stripe stays pay-bar-only
here.


---

## Compose AI writing banner polish (2026-08-06)

**Owner:** Banner must not imply draft-only (agents prepare + schedule);
Claude/ChatGPT letter placeholders; right-side Connections CTA awkward;
optionally add OpenClaw/Hermes if real Connections.

**Design (`overlayVals` / compose `aiHint*`):** title *Let AI write this post*;
subtitle *Use PostQueen from Claude, ChatGPT or your own agent*; chips
Claude + ChatGPT only (glyph tint tiles); **no** separate Connections CTA;
dismiss.

**Shipped (`editor.tsx`):**
- Title restored to design English; subtitle adds prepare + schedule (WORK).
- Removed standalone Connections pill — chips are the CTAs (→ `/connections`).
- Chip group on the right (`gap-[6px]`); sizes match design (30px chips,
  19px icons, 26px dismiss).
- Logos: `/icons/connections/{claude,chatgpt,openclaw,hermes}.svg` via
  `SafeImage` (same assets as Connections page).
- OpenClaw + Hermes chips **added** — real Connections catalog entries +
  assets exist.

**Raises:**
- Design banner subtitle understates scheduling (no “schedule”); Connections
  cards say draft/schedule/publish. Subtitle adjusted for WORK truth.
- Design `aiHintTools` is Claude + ChatGPT only; OpenClaw/Hermes are product
  Connections heroes — chips added per owner optional ask.
- Design chips use letter glyphs; we use real SVG assets (LOOK upgrade).
- `hermes.svg` in repo is itself an “H” tile glyph (same as Connections page).

**Checks:** Added `openclaw` / `hermes` to `docs/ui-migration-baseline/i18n.txt`.
`let_ai_write_this_post*` fallback text only (same keys). Handlers / dismiss /
`pq-compose-ai-hint-off` unchanged. Full `scripts/ui-migration-check.sh` still
reports pre-existing WIP drift on other i18n keys + gate counts — not from this
banner change; do not `--update` those baselines here.


---

## Checkout pay bar Stripe shift fix (2026-08-06)

**Owner:** Switching Lifetime ↔ subscription moved the bottom-bar Stripe
trust row (and felt like other chrome broke).

**Root cause:** Page rail used `max-w-[1600px]` (`CHECKOUT_MAX`) while
`SubmitBar` / `SubmitBarFallback` still used `max-w-[1360px]`. `mx-auto` on a
narrower bar pulled the left edge inward. Secondary: `flex-1` + variable
`shrink-0` mid/CTA widths + remount/`animate-fadeIn` between Lifetime and
subscription bars. Stripe SVG also had `mt-[2px]` which looked bottom-stuck.

**Fix (LOOK/layout only — no checkout WORK change):**
- Shared [`checkout-pay-bar.tsx`](apps/frontend/src/components/billing/checkout-pay-bar.tsx):
  exported `CHECKOUT_MAX` (1600) + `CheckoutPayBarShell` with stable
  `grid-cols-[1fr_minmax(320px,max-content)_auto]`.
- `LifetimePayBar`, `SubmitBar`, `SubmitBarFallback` all use the shell.
- Removed StripeTrust SVG `mt-[2px]` (baseline via `items-center`).

**Not in scope:** Payment form load failure / embed `client_secret`.


---

## Signatures Add form polish (2026-08-06)

**Owner:** Save CTA too wide (`flex-1`); Auto add Yes/No pills feel heavy for a boolean.

**Design:** Prototype form uses a Yes/No **select** for Auto add + Save.
**Owner ask:** checkbox instead — implemented (boolean WORK unchanged).

**LOOK:**
- Replaced `FormChoice` Yes/No with a compact checkbox + hint
  (`Append this signature when you create a new post.`)
- Save no longer `flex-1`; `px-[22px]` beside Cancel; actions right-aligned
- Placeholder via `t(write_your_signature)`

**Files:** `signatures.component.tsx`; i18n baseline +
`auto_add_signature_hint`, `write_your_signature`, `label_auto_add_signature`.


---

## Checkbox face: white + brand tick (2026-08-06)

**Owner:** Solid purple checkbox squares (Create Post X settings “Made with
AI” / “Paid partnership”) are unreadable — look like blocks, not controls.
Prefer white face + purple tick everywhere.

**Cause:** Shared `Checkbox` always used `bg-forth` (= `--brand`) even when
unchecked; tick was `text-pqOnBrand` (white on purple) and easy to miss.

**Fix:** `libraries/react-shared-libraries/src/form/checkbox.tsx` — face
`bg-pqOnBrand` (white token) + inset border; checked shows `text-pqBrand`
tick. Also fixed `watch || checked` so `false` is not treated as missing.
Signature Add form checkbox matched the same treatment.

**Call sites:** X / TikTok / LinkedIn / Instagram / Teams / Generator all
import the shared component — one fix covers them.


---

## Add Member form polish (2026-08-06)

**Owner:** Add Member title/body felt weak; Send Invitation Link CTA too wide;
checkbox still showed solid purple (stale compiled `checkbox.js` shadowed the
TSX face fix).

**LOOK:**
- `SettingsPaneEditor`: stronger title (`20/600`) + optional `description`
- Add Member: description, integrated checkbox label + contextual hint,
  compact right-aligned CTA (no `flex-1`); CTA sentence case
- Deleted stale `libraries/.../form/checkbox.js(.map)` so white+brand-tick
  TSX is what resolves

**WORK unchanged:** POST `/settings/team`, email/copy branches.


---

## Settings form footers + Integrations polish (2026-08-06)

**Owner:** Integrations Add API key (and similar Settings editors) had a
full-bleed primary next to a tiny Cancel; titles felt bare.

**Shared:** `ModalFormActions` is `justify-end`; stop recommending `flex-1`
primaries. Compact `shrink-0 px-[18px]` CTAs on Integrations, Autopost,
Webhooks, Plugs.

**Integrations:** SettingsPaneEditor description; API placeholder + hint;
sentence-case Add integration.

**Also:** Signature / Autopost / Webhook editor descriptions.


---

## Order Summary: drop Stripe trust (subscription) (2026-08-06)

**Owner:** Stripe line under Order Summary made the card too dense.

Removed `StripeTrust` from subscription `PriceBreakdown`,
`PriceBreakdownFallback`, and checkout `OrderSummaryFallback`. Trust stays on
the pay bar (+ payment-details column under the form). Matches Lifetime pass.


---

## Checkout / ended hero type bump (2026-08-06)

**Owner:** Hero title + subtitle on checkout and ended felt a bit small.

**Design:** `pwH1` 34/42/54, sub 17px. Already matched; bumped for presence:
- H1 → 38 / 48 / 60; sub → 19px; trust row 15.5; lapsed banner 15.5 + 20px icon
- Hero stack gap 18 → 22

**Second bump (same day):** Still small — H1 → **42 / 52 / 64**; sub → **21px**;
trust row → **17px** + check SVG 18 → **20**. Lapsed amber banner left at 15.5
(owner asked about the green-check row).

**RAISE:** Farther above prototype type scale per owner readability ask.


---

## Monthly/Yearly toggle balance (2026-08-06)

**Owner:** Yearly selected looked lopsided — selected pill grew around the
“N months free” chip while Monthly floated in empty trough.

**Fix:** Shared `BillingPeriodToggle` — equal visual weight for both segments.
Checkout + Plans `/billing` both use it.

**Follow-up (same day):** Toggle sat under “Choose a plan” (wrap) and Yearly-on
used inverted white/black + green-on-white chip — owner rejected.

**Fix 2:** Header `justify-between` (title left, toggle right, no wrap). Selected
segment = brand fill + on-brand label; “N months free” chip = on-brand face /
brand text when Yearly is on, ok-soft when off. Auto-width flex (not `grid-cols-2`).


---

## Lifetime switch during entire trial (2026-08-06)

**Owner:** Mid-trial Plans page hid Lifetime; design shows `ltUpsell` for every
`onTrial` account. Want convert only while trialing — not after first paid charge.

**Cause:** Upsell gated on `lifetimeWindow` (24h from signup), so most of the
7-day trial hid the strip. `/billing/lifetime` also redirected non-FREE non-lifetime
users away, so “Switch to lifetime” bounced back to Plans.

**Fix:**
- Plans upsell: `isTrailing && !isLifetime` (design). CTA = `BuyLifetime` →
  `POST /billing/lifetime-checkout` (no dead Link).
- Backend: allow checkout while `org.isTrailing` OR founding 24h window; refuse
  paid lifetime / already-on-lt-trial. Deferred setup uses `isTrailing|allowTrial`.
- `/billing/lifetime` allows trailing converts; countdown optional when window closed.

**Still true:** After first paid subscription (not trailing), no Lifetime convert.
Code redemption remains 24h-window gated.


---

## Plans Lifetime upsell: features + type (2026-08-06)

**Owner:** Trial Plans strip showed title/sub only — easy to forget what $49
unlocks vs checkout founding card. Title/sub felt small; muted grey unreadable.

**Design:** `ltUpsellFeatures: []` — strip has no feature bullets.

**Fix (owner override):** Same `BillingFeatures` grid as checkout
(`tier={ltUpsellTier}`, `tone="lifetime"`) under a `pqLtLine` hairline. Title
15.5 → 18; sub 12.5 muted → 14 `text-pqText`; pad 18×20.

**RAISE:** Features on Plans upsell are beyond prototype inventory.


---

## Channels: disable New post when reconnect needed; drop kebabs (2026-08-06)

**Owner:** Disconnected channel still allowed New post; ⋯ menu redundant on
Channels settings (detail + list).

**Design:** Keeps New post enabled while reconnect CTA shows — owner prefers
disable so the banner/Reconnect affordances are not undercut.

**Fix:** `needsAttention` → New post `disabled` + tooltip; `openComposer`
guard. Remove `Menu` from channel list rows and detail header (actions live in
Channel / Access groups). Calendar/sidebar menus unchanged.


---

## Posts list toolbar vs content alignment (2026-08-06)

**Owner:** All dates / calendar icon sat right of day headers + cards.

**Cause:** List scroller reserved a scrollbar while the Filters row
(`max-w-[860px] mx-auto`) did not — different center widths. Day headers also
had an extra `px-[2px]`.

**Fix:** `[scrollbar-gutter:stable]` on list + day scrollers and on the
contained Filters row; drop day-header `px-[2px]`; Filters `items-center` only
on `md:flex-row`.


---

## Checkout lifetime card: timer gating + feature hairline (2026-08-06)

**Owner:** Missing duration near “FOUNDING PRICE”; card felt dense above features.

**Timer:** Not a bug. `LifetimeOfferCard` shows the HH:MM:SS countdown only while
`lifetimeWindow(createdAt).open` (24h from signup) **and** `allowTrial`. After
the window closes, the strip switches to the static “Founding price” chip — the
card itself stays (trial convert is still allowed). Confirmed intentional.

**Look:** `h-px bg-pqLtLine` hairline between the title/price row and
`BillingFeatures` on the founding-member checkout card.


---

## Posts panel: platform icon beside avatar (2026-08-06)

**Owner:** Queue cards (Scheduled / Drafts / Posted) hid the network under a
tiny corner badge on the avatar — hard to tell LinkedIn vs X at a glance.

**Fix:** `QueueCard` matches calendar cards — platform logo `20px` square then
avatar circle side-by-side; drop overlay badge.


---

## Autopost stepped form redesign (2026-08-06)

**Owner:** Add Autopost still felt like a dense flat Settings form (small muted
subtitle, long Yes/No scroll, Save often missing until Send Test).

**Design:** Flat modal with the same fields — no wizard.

**Fix (owner LOOK upgrade):** In-pane `AddOrEditWebhook` is four steps — Feed →
Timing → Content → Channels. Numbered pills; Send Test on step 1; Next gated on
successful RSS check (`valid === url` + syncLast|lastUrl); Save always visible
on step 4 (disabled until ready). APIs/DTO unchanged.

**Also:** `SettingsPaneEditor` description 13.5 muted → 14.5 `text-pqText`.

**RAISE:** Stepped pane beyond prototype flat inventory; Save still test-gated
(WORK) but no longer hidden.


---

## Posts list: restore 860 + Pick a date (2026-08-06)

**Owner:** Full-bleed list was not requested — revert. Date filter needs a real
calendar day pick, not only presets.

**Fix:**
- Restore `max-w-[860px]` + scrollbar-gutter for list/day Filters + ListView/DayView.
- All dates menu → **Pick a date…** opens Mantine `Calendar`; sets
  `listRange` `day:YYYY-MM-DD` (existing filter). Prev/next chevrons when a day
  is active.

**RAISE:** Design RANGES have no custom picker; list API still has no date
params (client-side only).


---

## Lifetime surfaces: flat fills + Plans upsell tidy (2026-08-06)

**Owner:** Diagonal amber → dark fade on lifetime cards felt heavy (“sağa
karartma”) on Plans upsell, Founding Member thank-you, checkout/ended founding
card, `/billing/lifetime`.

**Fix:**
- `--ltCardOn` / `--ltCardOff` → solid washes (dark + light); Tailwind
  `pqLtCardOn`/`Off` moved from `backgroundImage` → `colors`.
- Plans trial upsell: drop inline gradient → `bg-pqLtCardOn`; two-zone layout
  (offer+features | price+CTA); badge under title; shorter sub fallback.

**RAISE:** Flat fills vs prototype fade-to-transparent; upsell layout beyond
design one-row strip (features kept).


## Connect PostQueen panel — 2026-08-06

Replaced the full-page `/connections` marketing catalog with a Settings-scale
dual-pane **Connect PostQueen** panel (LOOK inspired by connectors catalogs;
WORK and copy stay PostQueen-only).

### IA (left nav → right pane)

| Nav | Right pane |
| --- | --- |
| AI Agents | Hub: Claude, ChatGPT, Claude Code, Cursor, Codex, Gemini CLI, OpenClaw, Hermes + chat front-doors |
| MCP | Warp, Cline, Windsurf, Any MCP client + URL/Bearer callout |
| Agent Skills | Skill install callout (`npx skills add GkhanKINAY/postqueen-agent`) + OpenClaw / Hermes / Claude Code / Codex |
| Automation | n8n, Zapier/Make (SOON), Webhooks, RSS AutoPost |
| CLI & API | CLI, Public API, Node SDK, OAuth (links into Developers) |
| Developers | Embedded `PublicComponent` (Access + Apps) — no duplicate rotate API |
| Approved Apps | Embedded `ApprovedAppsComponent` |
| Media | HeyGen / Reel.Farm cards → Settings → Integrations |

### Entry points

1. Rail **Connect PostQueen** → `/connections` (panel scrim)
2. Settings → Developers → **Connect PostQueen** row → same route (`leaveSettingsFor`)
3. `/connections` → `ConnectPage` (min 1040×680 card on scrim)
4. Deep-links `?nav=mcp&connector=claude` (aliases: `claude` → `claude-apps`, etc.)

### Docs accuracy

Verified against `docs.postqueen.ai` / `llms.txt`:

- Skill: `npx skills add GkhanKINAY/postqueen-agent` ✓
- MCP: `{backendUrl}/mcp/{apiKey}` and Bearer on `/mcp` — API key, not OAuth ✓
- OpenClaw / Hermes: Agent Skills only — no invented `openclaw mcp add` ✓
- CLI: `npm install -g postqueen` · SDK: `@postqueen/node` ✓
- Catalog docs URLs unchanged and still match live docs paths ✓

Tour: `connect-pq` stays on the rail button; `connections-page` spotlights
`[data-connect-panel]` / `[data-tour="connections-page"]` on the panel card.
Copy updated for category-left IA.

### Raises

1. **Typefully / Notion Agents** — not invented; panel inventory is PostQueen catalog only.
2. **Settings Developers still has its own Access/Apps** — Connect embeds the same
   components; not removed from Settings (capability must stay reachable).
3. **Screenshot matrix** — not run here (needs `PQ_AUTH` + local app).
4. **`set_delay` i18n key** — picked up from `delay.component.tsx` during baseline
   update; unrelated to Connect panel (incidental).

### Checks

`scripts/ui-migration-check.sh --update` PASS

- types (frontend) 0 · types (backend) 0
- api 154 unchanged
- routes 30 unchanged
- gates 14 unchanged
- i18n **~1451 → 1520** (Connect panel nav/hub/MCP callout keys + incidental `set_delay`)

### Files

- `apps/frontend/src/components/public-api/connections.catalog.ts` (catalog + nav map)
- `apps/frontend/src/components/public-api/connect-panel.tsx` (**new** panel)
- `apps/frontend/src/components/public-api/connections.component.tsx` (thin re-exports)
- `apps/frontend/src/components/public-api/public.component.tsx` (`embeddedInConnect`)
- `apps/frontend/src/components/layout/settings.component.tsx` (Connect row)
- `apps/frontend/src/components/layout/leave-settings.ts` (connect scrim)
- `apps/frontend/src/components/onboarding/tour.tsx` (connections-page copy)
- `docs/ui-migration-baseline/i18n.txt`
- `docs/ui-migration-log.md` (this entry)


---

## Posts list date filter: stacking + sort placement (2026-08-06)

**Owner:** Date presets/`Pick a date` menu sat under the Calendar sibling and was
clipped by Filters `overflow-y-auto`. Sort sat mid-toolbar (design-left);
owner wants Newest/Oldest on the right after the flex spacer.

**Fix (`filters.tsx` only):**
- Presets menu `z-[300]` + opaque `bg-pqPop border-pqBorder shadow-menu`; selected
  row `bg-pqBrandSoft text-pqFocused` (no raw rgba).
- Open date cluster: `relative z-[40] bg-pqInner` strip above Calendar sibling.
- Second `useAnchoredPopover` for Pick a date — fixed flip/shift, escapes
  overflow clip; Mantine day selected `bg-pqBrand text-pqOnBrand`.
- List toolbar order: Date → Status → `flex-1` → Newest/Oldest.

**WORK unchanged:** `listRange` / `postInListRange` / `day:YYYY-MM-DD` / sort
handlers / chevrons.

**RAISE:** Design keeps sort left of the spacer; owner override places it right.


## Connect panel nav polish — 2026-08-06

Sidebar IA polish for the Connect PostQueen panel. WORK unchanged (catalog
copy, API keys, deep-link aliases for connectors); LOOK/nav only.

### Changes

1. **Sidebar label** — Settings-style soft label `Connectors`
   (`connect_nav_section`). Frame title, Settings → Developers row, and mobile
   chrome keep `connect_postqueen` ("Connect PostQueen").
2. **Chat nav** — New `chat` ConnectNavId; AI Agents is agents + assistants only.
   Flat Chat hub; Chat front-doors subsection removed from AI Agents.
3. **Chat icons** — WhatsApp / Telegram / Slack / Discord replaced with 30×30
   square brand tiles (Claude/Cursor pattern) under `/icons/connections/`.
4. **CLI · API split** — `cli-api` → `cli` (CLI only) and `api` (API, SDK,
   OAuth). Legacy `?nav=cli-api` aliases to `api`.
5. **Automation accordion** — Parent row toggles expand (chevron). Children:
   n8n, Zapier (SOON), Make (SOON), Webhooks, RSS AutoPost — child click opens
   detail. `?connector=zapier|n8n|make|webhooks|rss` expands + detail;
   `?nav=automation` alone shows a compact pick list. Mobile: five flat chips
   (no nested accordion).
6. **Connectors vs Account** — Connectors group then hairline + muted Account
   label with Developers · Approved Apps.
7. **Media dropped from Connect nav** — HeyGen / Reel.Farm stay in catalog data;
   keys via Settings → Integrations. `?nav=media` → `ai-agents`.

### Files

- `apps/frontend/src/components/public-api/connections.catalog.ts`
- `apps/frontend/src/components/public-api/connect-panel.tsx`
- `apps/frontend/public/icons/connections/{whatsapp,telegram,slack,discord}.svg`
- `docs/ui-migration-log.md` (this entry)


---

## Posts list All tab + richer empty state (2026-08-06)

**LOOK:** List toolbar status segments restore **All** left of Scheduled →
Drafts → Posted. Default `listState` is `'all'` (list fetch sends `state=all`).
Posts panel tabs stay Scheduled / Drafts / Posted only (design queue inventory;
no All invented there).

**Empty state (ListView):** Owner override vs design's icon+line — richer empty
matching Media/Analytics: 46px token tile, headline (existing per-`listState`
keys; All uses `no_posts`), muted subtitle, primary Create Post CTA (same
`find-slot` + set picker + `AddEditModal` path as header `NewPost`), and a
secondary "Show all dates" text link when `listRange !== 'all'`.

**WORK unchanged:** Past-oriented date presets still reset only when switching
**to** Scheduled; `listRange` / `writeLaunchesUrl` / list paging untouched.
Connect panel not touched.

### Files

- `apps/frontend/src/components/launches/filters.tsx` (All segment)
- `apps/frontend/src/components/launches/calendar.context.tsx` (default `all`)
- `apps/frontend/src/components/launches/calendar.tsx` (ListView empty)
- `docs/ui-migration-log.md` (this entry)


---

## Connect AI Agents hub order — 2026-08-06

**LOOK:** AI Agents hub sorts by explicit id order (OpenClaw → Hermes → Claude
→ Claude Code → ChatGPT → Codex → Cursor → Gemini). Hub splits into two muted
uppercase strips — **Agents** (OpenClaw, Hermes) and **Assistants** (the rest).
Blurb em dash softened to a period.

**WORK unchanged:** same catalog inventory; no new connectors. `connectionsForNav`
sort only; unknown ids append after the list.

### Files

- `apps/frontend/src/components/public-api/connections.catalog.ts`
- `apps/frontend/src/components/public-api/connect-panel.tsx`
- `docs/ui-migration-log.md` (this entry)


---

## Posts list empty state polish (2026-08-06)

**LOOK:** ListView empty swaps the doc icon for `PostQueenLogo` (52px tile /
28px crown) on a soft `bg-pqBrandFaint` circle. Subtitle English fallbacks drop
em/en dashes. Single primary Create Post CTA (`min-w-[180px]`); “Show all
dates” stays a muted `text-pqSoft` link below only when `listRange !== 'all'`.

**WORK unchanged:** All-tab default, list fetch, posts.panel empty, Connect
panel.

### Files

- `apps/frontend/src/components/launches/calendar.tsx` (ListView empty)
- `docs/ui-migration-log.md` (this entry)


---

## Posts list date menu trim (2026-08-06)

**Owner:** All dates dropdown felt too long (11+ presets).

**LOOK:** Menu back to design RANGES — All dates, Today, This week, Next 3 days;
Drafts/Posted/All status also get Past only; **Pick a date…** kept. Removed
Tomorrow / Yesterday / Next 7 / months / Past week from the menu.

**WORK:** `postInListRange` still understands the removed presets (orphan URL /
state keeps a chip label until changed).

### Files

- `apps/frontend/src/components/launches/filters.tsx`
- `docs/ui-migration-log.md` (this entry)


---

## Calendar Day/Week/Month click-label jump (2026-08-06)

**Owner override:** design may not show this. Middle Day/Week/Month range label
is now a button; click opens the same floating Mantine `Calendar` pattern as
list **Pick a date** (`useAnchoredPopover`, `z-[300]`, `bg-pqPop` / token day
styles). Picking a day jumps via `getDateRange(display, YYYY-MM-DD)` (ISO week
or month containing the day). Prev/next/Today and list All dates menu unchanged.

### Files

- `apps/frontend/src/components/launches/filters.tsx`
- `docs/ui-migration-log.md` (this entry)


---

## Connect hub: drop kind badges (2026-08-06)

**Owner:** AGENT / MCP / SKILL / CHAT / API pills next to card titles are
redundant with the left nav category.

**LOOK:** Hub cards and detail headers no longer show kind labels. **SOON** /
**OFFICIAL APP SOON** kept for Zapier/Make. Catalog `kind` unchanged (skills
filter / nav).

### Files

- `apps/frontend/src/components/public-api/connect-panel.tsx`
- `docs/ui-migration-log.md` (this entry)

---

## Connect hub — Typefully-style short copy (2026-08-06)

Typefully-style Connect hub `short` copy rewrite in
`connections.catalog.ts`. Detail `intro` unchanged. Design raise: owner copy
outranks long handoff blurbs for hub cards. heygen / reelfarm left as-is
(already concise).

### Files

- `apps/frontend/src/components/public-api/connections.catalog.ts`
- `docs/ui-migration-log.md` (this entry)

---

## Date format preference (2026-08-06)

**Design raise:** Prototype Settings has Date Metrics (AM/PM vs 24h) only — no
separate date-order control (MM/DD/YYYY vs DD/MM/YYYY). Shipped anyway so English
UI no longer hardcodes US order via dayjs `format('L')` / fixed `DD/MM` strings.
Owner can decide later whether the control stays in Global Settings or moves.

### What shipped

- Split preferences: `localStorage.dateFormat` = `MDY` | `DMY` (date order);
  `localStorage.isUS` = `US` | `GLOBAL` remains **time-only** (Date Metrics UI
  unchanged).
- Soft migration: missing `dateFormat` → from `isUS` (US→MDY) else navigator
  `en-US`→MDY else DMY.
- Central helper `date.format.tsx` + `useDateFormat()` (`useSyncExternalStore`)
  so Settings changes re-render calendar without reload. Optional dayjs
  `formats.L` override as safety net.
- Settings: sibling **Date format** chip card under Date Metrics
  (`date_format`, `date_format_mdy`, `date_format_dmy`).
- Call sites: calendar/filters/date.picker, comments, post-url-selector,
  analytics chart/stars table/trending, notifications, preview date, posts
  panel / manage modal toasts, time table, billing long dates, trial-lock,
  media / approved-apps / announcements / impersonate / admin-stats /
  admin-errors / import-debug. Wire formats stay ISO / `YYYY-MM-DD`.
- `isUSCitizen` documented + implemented as time-only alias of
  `use12HourClock()`; no remaining date-order call sites.

### Checks

```
scripts/ui-migration-check.sh
```

- **types** (frontend + backend): ok — 0 errors
- **api**: ok — 154 entries, unchanged
- **routes**: ok — 30 entries, unchanged
- **gates**: ok — 14 entries, unchanged
- **i18n**: baseline patched for `date_format`, `date_format_mdy`, `date_format_dmy`
  only. Remaining i18n set drift (`connect_hub_*` / `connect_nav_*` renames,
  `list_empty_*`, `pick_a_*`, `show_all_dates`) is pre-existing WIP on this
  working tree — not introduced by this preference. Not absorbed into this
  step’s baseline update.

### Files

- `apps/frontend/src/components/launches/helpers/date.format.tsx` (new)
- `apps/frontend/src/components/launches/helpers/isuscitizen.utils.tsx`
- `apps/frontend/src/components/settings/date.format.component.tsx` (new)
- `apps/frontend/src/components/settings/metric.component.tsx`
- `apps/frontend/src/components/settings/global.settings.tsx`
- `apps/frontend/src/components/launches/filters.tsx`
- `apps/frontend/src/components/launches/calendar.tsx`
- `apps/frontend/src/components/launches/helpers/date.picker.tsx`
- `apps/frontend/src/components/launches/repeat.component.tsx`
- comments / post-url-selector / analytics / notifications / preview /
  posts.panel / manage.modal / time.table / billing / trial-lock / media /
  approved-apps / announcement / impersonate / admin-stats / admin-errors /
  import-debug-post
- `docs/ui-migration-baseline/i18n.txt` (+3 keys)
- `docs/ui-migration-log.md` (this entry)

---

## Connect hub — card density + full-bleed marks (2026-08-06)

Typefully-style density for Connect hub cards and bare-mark logos.

### LOOK

- **hubCard:** removed forced `min-h-[108px]` / hero `min-h-[124px]` so cards
  hug content (no bottom dead band). Removed `line-clamp-2` on `short` — natural
  wrap; title still `truncate`. Padding / horizontal icon+text layout unchanged.
- **SVGs:** stripped purple inset frames (`rect` + nested 20×20 mark) from bare
  marks used on AI Agents / Assistants (`chatgpt`, `cursor`, `codex`,
  `gemini-cli`, `openclaw`, `hermes`, plus sibling Assistants `cline`,
  `windsurf`, `warp`, `other-clients`). Tight viewBox on the glyph so ConnIcon
  40px fills the box. No CSS ring added around image icons.
- **Claude peach tile retained** (`claude.svg` `#d97757`) — Claude Code reuses
  the same asset. Chat brand tiles (WhatsApp / Telegram / Slack / Discord)
  unchanged. Glyph fallbacks keep `ring-1` box in ConnIcon.
- OpenClaw hub short confirmed Typefully copy: “Post from WhatsApp, Telegram,
  Slack, and Discord” (no revert to long “A personal agent…”).

### Files

- `apps/frontend/src/components/public-api/connect-panel.tsx`
- `apps/frontend/public/icons/connections/{chatgpt,cursor,codex,gemini-cli,openclaw,hermes,cline,windsurf,warp,other-clients}.svg`
- `docs/ui-migration-log.md` (this entry)


## Settings Connect group + faster leave (2026-08-06)

**Owner:** Settings left-nav section **DEVELOPERS → CONNECT**; Connect PostQueen
row shows an external-link affordance; click closes Settings and opens
`/connections`.

**Why Connect felt slow:** `leaveSettingsFor` used `window.location.assign`
(full reload) to avoid a prior `back()`+`push` race. Switched to a single
client `router.push(path)` — dismisses `@modal/(.)settings` without remounting
the app.

**Raise:** Prototype section label was Developers; owner copy Connect outranks.

### Files

- `apps/frontend/src/components/layout/settings.component.tsx`
- `apps/frontend/src/components/layout/leave-settings.ts`
- `apps/frontend/src/components/settings/teams.component.tsx` (comment)

---

## Connect CLI — docs-accurate auth (2026-08-06)

Aligned Connect panel CLI copy/steps with
[CLI introduction](https://docs.postqueen.ai/cli/introduction) and
[Authentication](https://docs.postqueen.ai/cli/authentication).

### WORK (docs)

- **Steps:** (1) `npm install -g postqueen` (+ pnpm / `--help` detail),
  (2) `export POSTQUEEN_API_KEY=…` from Settings → Developers → Public API,
  (3) `postqueen integrations:list`. Dropped `auth:login` as the primary path
  (hosted auth server unavailable; OAuth device flow is advanced/self-hosted —
  noted in step detail + Authentication docs link).
- **Hub blurb:** install / export key / schedule from shell — not skill-install
  language (`npx skills add`).
- **CliSetupCallout** on CLI hub (mirrors SkillInstallCallout): three steps,
  masked API key until Reveal, prominent docs link to CLI introduction.

### LOOK

- External-link icon (same path as Settings → Connect PostQueen) on detail-pane
  `docs` / `paths` CTAs (replaced trailing `→`) and on Skill/CLI callout docs
  links.

### Files

- `apps/frontend/src/components/public-api/connections.catalog.ts`
- `apps/frontend/src/components/public-api/connect-panel.tsx`
- `docs/ui-migration-log.md` (this entry)

## Connect soft-open via (.)connections (2026-08-06)

**Owner:** Opening Connect must keep the previous page visible under the
translucent `bg-pqPopup` scrim (same as Settings) — not a solid black void.

**Cause:** `/connections` was only a hard page route, so client nav replaced
`children` and nothing sat under the scrim.

**Fix:** Soft intercept `@modal/(.)connections/page.tsx` mirroring Settings
(`(.)settings`). Hard `connections/page.tsx` kept for refresh / direct URL.
Rail `<Link href="/connections">` and Settings `leaveSettingsFor` (`router.push`)
hit the intercept from in-app pages. Close = `router.back()` on ConnectPage.
`bg-pqPopup` unchanged.

### Files

- `apps/frontend/src/app/(app)/(site)/@modal/(.)connections/page.tsx`
- `docs/ui-migration-log.md` (this entry)

## Checkout ended CTA: Resubscribe not Pay Now (2026-08-06)

**Bug:** `SubmitBarFallback` (Stripe session not ready) used `billing_pay_now` whenever `!allowTrial`, so ended/lapsed checkout showed **Pay Now**. Live `SubmitBar` already used **Resubscribe to {plan} – $X** for the same signal.

**Fix:** Fallback matches SubmitBar — `!allowTrial` → `billing_resubscribe_to_plan` with `tierLabel(tier)` and `$amount`. Trial CTA unchanged.

### Files

- `apps/frontend/src/components/billing/embedded.billing.tsx`
- `docs/ui-migration-log.md` (this entry)

## Trial lock Or wait: dated (2026-08-06)

**LOOK:** `TrialLockCard` foot shows `Or wait — {name} unlocks on {date} when your trial ends.` when `trialWindow(user.createdAt).endsAt` is known (same clock as billing heroes). Explicit `unlocksOn` prop still wins; missing/invalid → undated fallback. Foot is **start-aligned** (prototype `xLockFoot` sits in the CTA row, not a centered full-width line). An earlier pass briefly used `text-center`; corrected below.

### Files

- `apps/frontend/src/components/billing/trial-lock-card.tsx`
- `apps/frontend/src/components/launches/add.provider.component.tsx` (comment)
- `docs/ui-migration-log.md` (this entry)

## Create Post selected channels: checkmark (2026-08-06)

**Owner:** SELECT CHANNELS row was purple ring + grayscale only — hard to see selected. Match AI Copilot channel tick.

**LOOK:** Selected avatars in `PicksSocialsComponent` get the same brand check badge as Agents (`absolute -start/-top`, 16px `bg-pqBrand` circle + white path). Ring/grayscale unchanged.

### Files

- `apps/frontend/src/components/new-launch/picks.socials.component.tsx`
- `docs/ui-migration-log.md` (this entry)

## Compose tabs: hint above, check not X, Remove channel (2026-08-06)

**Owner:** Global-mode hint was below the tabs and hard to notice; red X on channel tabs was unclear; active tab needed a clear check like SELECT CHANNELS / AI Copilot.

**LOOK / WORK:**
- Hint (“You are in global editing mode · Click a channel…”) moved **above** the tab row.
- Channel tabs: larger round avatars (46px), brand ring + purple check when active; no red X. Deselected tabs grayscale.
- **Remove channel** text button on the editor top-end (confirm dialog; store still flips `current` to global).

### Files

- `apps/frontend/src/components/new-launch/select.current.tsx`
- `apps/frontend/src/components/new-launch/editor.tsx`
- `docs/ui-migration-log.md` (this entry)

## Compose AI hint: lighter, better copy (2026-08-06)

**Owner:** Filled purple/grey panel felt permanent and ugly (title, sub, icon).

**LOOK:** Dropped gradient fill + inset ring + filled icon tile. Tip is now a hairline row (border-t only): outline sparkles in brand, clearer copy, ghost agent chips (hover only), dismiss control. Same keys / dismiss / `/connections` links.

**Copy (en):** “Draft with your AI” / “Connect Claude, ChatGPT, OpenClaw or Hermes — then ask them to draft this post”.

### Files

- `apps/frontend/src/components/new-launch/editor.tsx`
- `libraries/react-shared-libraries/src/translation/locales/en/translation.json`
- `docs/ui-migration-log.md` (this entry)

## Compose preview: no channel empty state (2026-08-06)

**Bug:** Global preview fell back to `allIntegrations[0]` when nothing selected, so Post Preview showed the first connected account (e.g. X) while the badge said “none yet”.

**Fix:** Empty selection → design empty copy (“Check the circles above to pick a channel”). Preview only uses a selected channel.

### Files

- `apps/frontend/src/components/new-launch/providers/show.all.providers.tsx`
- `docs/ui-migration-log.md` (this entry)

## Soft Settings/Connections: freeze chrome under scrim (2026-08-06)

**Bug:** Soft-open Settings (`@modal/(.)settings`) or Connections (`@modal/(.)connections`)
changed the blurred header title (e.g. Calendar → Settings) and rail active state,
even though the previous page stayed mounted in `(site)` children under the scrim.

**Root cause:** Intercept keeps `children` correct, but `Title` / `MenuItem` read
`usePathname()` — the URL is `/settings` or `/connections` during soft-open.

**Fix:** `useChromeLocation()` freezes the last non-overlay location for chrome.
Hard load of `/settings` or `/connections` (no prior page) still titles itself.
`router.back()` restores the original page and chrome together.

### Files

- `apps/frontend/src/components/layout/use-chrome-location.ts`
- `apps/frontend/src/components/layout/title.tsx`
- `apps/frontend/src/components/new-layout/menu-item.tsx`
- `docs/ui-migration-log.md` (this entry)

## Soft-open Connect/Settings: stop Calendar↔Posts flip (2026-08-06)

**Bug:** Soft `/connections` or `/settings` keeps `CalendarWeekProvider` mounted while URL loses `?display=`. Sync effect fell back to stale `calendar-display` cookie → background flipped Calendar↔Posts.

**Fix:** Bail the searchParams sync unless `pathname` starts with `/launches`. When URL has `display`, also write the cookie so rail switches stay aligned.

### Files

- `apps/frontend/src/components/launches/calendar.context.tsx`
- `docs/ui-migration-log.md` (this entry)

## Settings: Your user section (2026-08-06)

**Owner:** Workspace settings ≠ user settings. Open a **Your user** nav group; move
email notification prefs there; add timezone + delete-account surfaces; restyle
Notifications toward a Typefully-like page using **only** existing WORK.

### Shipped

- Settings nav groups: **Workspace** → **Your user** → **More** → **Connect**.
- **Your user → Notifications** (`?tab=notifications`): Success / Failure /
  Streak email toggles (existing `/user/email-notifications` API), Email card
  with address, Typefully-inspired row layout (toggle right-aligned). Soft-open
  Settings + deep-link still work.
- **Your user → Account** (`?tab=account`): Timezone row (shows
  `localStorage`/`dayjs.tz.guess()` via `getTimezone()`), Change/Detect disabled
  + Coming soon; Delete Account + Request Account Deletion muted + Coming soon.
- **Global Settings** no longer hosts email prefs (metrics / date format /
  shortlink remain).

### Timezone decision

**Coming soon (option 2), not a live picker.** `SetTimezone` is commented out in
`(app)/layout.tsx`; calendar/scheduling use `newDayjs` and channel `timezone Int`
offsets. Writing `localStorage` + `dayjs.tz.setDefault` mid-session without a
careful rollout risks confusing schedule display. UI shows current guessed/stored
value; full picker needs a deliberate pass (optionally re-enable `SetTimezone`).

### Raises (not silently invented)

| Reference / ask | Repo WORK | Action |
| --- | --- | --- |
| Typefully Email + Slack BETA + Comments + Activity | Only success / failure / streak email prefs | Shipped the three; no Slack connect, comment checkboxes, or activity section |
| Workspace name rename | No org-rename endpoint/UI after create (`company` only at signup) | Not surfaced |
| Delete / request account deletion | No delete-account API | Coming soon UI only |
| User name / photo under Your user | `/user/personal` + `UserDetailDto` exist; no Settings UI | Deferred (owner: later) |
| Timezone picker | `localStorage` key `timezone` + `set.timezone.tsx`; layout hook disabled | Display + Coming soon; raise full picker |
| Prototype `settingsVals` still puts Email under Global Settings | Owner product decision outranks stale prototype inventory for this split | Logged |

### Checks (`scripts/ui-migration-check.sh --update`)

Types 0. Baselines rewritten at tip: **api 154**, **i18n 1555**, **routes 31**,
**gates 14** (i18n delta includes `your_user`, `account`, `timezone*`,
`delete_account*`, `coming_soon`, etc.; api/routes/gates reflect broader tip WIP
plus this step).

### Files

- `apps/frontend/src/components/layout/settings.component.tsx`
- `apps/frontend/src/components/settings/global.settings.tsx`
- `apps/frontend/src/components/settings/email-notifications.component.tsx`
- `apps/frontend/src/components/settings/user.account.component.tsx`
- `docs/ui-migration-baseline/i18n.txt`
- `docs/ui-migration-log.md` (this entry)

## Trial lock Or wait: start-aligned (2026-08-06)

**LOOK:** Foot stays start-aligned (`text-start`), matching prototype `xLockFoot` — not centered. Date wiring unchanged (`trialWindow` / `unlocksOn`). Description copy left as OAuth tip pending owner choice.

### Files

- `apps/frontend/src/components/billing/trial-lock-card.tsx`
- `docs/ui-migration-log.md` (this entry)

## Trial lock: design sub + centered foot (2026-08-07)

**Owner:** Locked X step still showed the OAuth “logged in into your current
account…” tip (connect-step copy). Foot “Or wait…” looked left-shifted under
full-width CTAs.

**LOOK:** Description = prototype channel-lock sub (`X charges us per post…`).
Foot `text-center`. OAuth tip stays on the live connect step only.

### Files

- `apps/frontend/src/components/billing/trial-lock-card.tsx`
- `apps/frontend/src/components/launches/add.provider.component.tsx`
- `docs/ui-migration-log.md` (this entry)

## Connect panel: Settings-like search chrome (2026-08-06)

**Ask:** CONNECTORS left-rail top should match Settings (search field) and filter
the nav (AI Agents, Chat, MCP, …).

### Shipped

- Left column now starts with the same search chrome as Settings
  (`p-[14px_12px_10px]`, 34px input, magnifier, `bg-pqInner` inset border /
  brand focus) — mirrored from `settings.component.tsx` / prototype
  `settingsVals`.
- Placeholder `search_connectors` → “Search connectors”.
- Filters CONNECTORS + ACCOUNT rows by label substring; empty groups hide.
  Automation children match by name and auto-expand the accordion while
  querying. Right-pane hub/detail WORK unchanged.

### Checks

`scripts/ui-migration-check.sh --update` PASS — types 0 · api 154 · routes 31 ·
gates 14 · i18n tip **1555 → 1557** (this step adds `search_connectors`; other
delta is existing tip WIP already reflected in prior Settings entry).

### Files

- `apps/frontend/src/components/public-api/connect-panel.tsx`
- `docs/ui-migration-baseline/i18n.txt`
- `docs/ui-migration-log.md` (this entry)

## Settings nav: drop Your user / Account (2026-08-06)

**Owner:** Nav felt too dense. For now remove the **Your user** section and the
**Account** row; park **Notifications** under **Workspace**.

### Shipped

- Settings nav groups: **Workspace** → **More** → **Connect** (no Your user).
- Workspace inventory: Global Settings, Language, Teams (admin), Notifications.
- Account hidden from the sub-nav; `user.account.component.tsx` kept;
  `?tab=account` still opens the pane if deep-linked.
- Notifications deep-link (`?tab=notifications`) unchanged.

### Files

- `apps/frontend/src/components/layout/settings.component.tsx`
- `apps/frontend/src/components/settings/global.settings.tsx`
- `docs/ui-migration-log.md` (this entry)

## Media Library / Insert Media UX polish (2026-08-06)

**Owner:** Insert Media sheet was near-fullscreen and noisy (names + search +
hover enlarge). Tighten to a design-like sheet; simplify picker vs Media page
name/search rules; click-to-select with a hard 5-item cap.

### Shipped

1. **shrink-modal** — Both Insert Media `showModal` sites (`MultiMediaComponent` /
   `MediaComponent`) drop `fullScreen` / viewport `height`; open at
   `size`/`maxSize` `1000px` so the shell’s `max-h-[86vh]` applies. Picker body
   uses `max-h-[calc(86vh-120px)]` + internal scroll (no forced
   `calc(100% - 80px)` height). Design Media / Polonto fullscreen unchanged.
2. **names-search** — Insert picker: no search field, no `originalName` overlay.
   Media page grid: no caption under thumb (type/duration badges kept); search
   hidden. Media page list: name column + search kept. Clearing search when
   picker mounts / when Media page switches to grid.
3. **picker-select-ux** — Tile click = select/deselect; hover enlarge/preview
   removed from picker (Media page lightbox unchanged). Subtitle copy via
   `select_or_upload_pictures_max_5` + `you_can_drag_drop_pictures`. Cap at 5 in
   `addRemoveSelected` (toast on exceed); uploads auto-selected into the picker
   also sliced to remaining room. Footer shows `Add selected media (n)` when
   `n > 0` (same key). Pagination kept when `pages > 1`; spacing tightened
   (`mt-[8px]`).

### Raises / deviations

- `maxSize: '1000px'` paired with `size` so Tailwind’s default modal
  `max-w-[min(920px,…)]` does not clamp the 1000px sheet.
- Upload→selected path silently respects the same 5 cap (toast only on click
  select over cap).

### Checks

Code-path review only (picker vs standalone). No new i18n keys; handlers / API
paths unchanged. Prefer source `.tsx` — ignore compile artifacts.

### Files

- `apps/frontend/src/components/media/media.component.tsx`
- `apps/frontend/src/components/media/media.box.tsx`
- `apps/frontend/src/components/media/media.pagination.tsx`
- `docs/ui-migration-log.md` (this entry)

## Settings Workspace: Teams 2nd (2026-08-06)

**LOOK:** Workspace nav order is Global Settings → Teams (org admin) → Language → Notifications.

### Files

- `apps/frontend/src/components/layout/settings.component.tsx`
- `docs/ui-migration-log.md` (this entry)

## Split Developers → API Keys + Developers (2026-08-06)

**LOOK / WORK:** Settings CONNECT and Connect panel ACCOUNT no longer share one Developers row with Access|Apps tabs. Inventory is Connect PostQueen → **API Keys** (public key) → **Developers** (OAuth apps) → Approved Apps. Access|Apps chrome removed from `PublicComponent`.

### Files

- `apps/frontend/src/components/public-api/public.component.tsx`
- `apps/frontend/src/components/layout/settings.component.tsx`
- `apps/frontend/src/components/public-api/connections.catalog.ts`
- `apps/frontend/src/components/public-api/connect-panel.tsx`
- `docs/ui-migration-baseline/i18n.txt`
- `docs/ui-migration-log.md` (this entry)

## Baseline refresh after API Keys / Developers split (2026-08-07)

`scripts/ui-migration-check.sh --update`: i18n drop of unused Access|Apps keys
(`access`, `apps`, `developers_description`); gates `tier.public_api` 3→4 (API Keys
+ Developers panes). Copilot inset + Generate video visibility already shipped
(see 2026-08-06 entry) — re-verified in code.

### Files

- `docs/ui-migration-baseline/{i18n,gates,api,routes}.txt`
- `docs/ui-migration-log.md` (this entry)

## Owner backlog ship (2026-08-07)

1. **Global multi-preview:** every selected channel’s native preview stacks in global mode; Ads Manager–style **All** + channel chips filter visibility without leaving global edit. Empty selection empty state kept; single `GeneralPreview` global block removed.
2. **Media page:** lightbox hides filename; search removed; list = Alt text / Format / Upload date / Size; API returns `createdAt`; ALL FILES spacing.
3. **Insert Media:** wider sheet (~1200px), denser 8-col grid, inset selection (no cut badge), ⋯ menu (Preview/Download/Delete), visible dashed drop zone.
4. **Settings Account:** Connect PostQueen row removed; section label **Account**; key icon for API Keys; OAuth empty/create/manage copy + form chrome tightened.

### Files

- `show.all.providers.tsx`, `high.order.provider.tsx`
- `media.box.tsx`, `media.lightbox.tsx`, `media.component.tsx`, `media.repository.ts`
- `settings.component.tsx`, `developer.component.tsx`, `connect-panel.tsx`
- `docs/ui-migration-log.md` (this entry)

## Public share preview polish (2026-08-07)

Calendar → Preview opens `/p/[id]?share=true` (public client-share page), not the
compose preview. That route was never migrated and looked sparse: void canvas,
tiny left-aligned card, blank Publication Date (`dynamic` + `ssr: false`), lone
login button, and `@@handle` when the profile already included `@`.

**LOOK:** Centered ~1100px stage, header hairline, bordered `bg-pqInner` post
cards + comments panel. Logged-out comments show muted helper + full-width CTA.
Date renders as a normal client component (SSR-safe defaults via
`useDateFormat`); invalid/missing → `Not scheduled`. Profile handle only prepends
`@` when missing.

**WORK unchanged:** same public fetch, share copy, comments APIs, calendar
`window.open`. No native channel previews (raise separately).

`scripts/ui-migration-check.sh`: types/api/routes/gates ok; i18n +2
(`login_to_leave_feedback`, `not_scheduled`) — baseline updated with `--update`.

### Files

- `apps/frontend/src/app/(app)/(preview)/p/[id]/layout.tsx`
- `apps/frontend/src/app/(app)/(preview)/p/[id]/page.tsx`
- `apps/frontend/src/components/preview/comments.components.tsx`
- `apps/frontend/src/components/preview/render.preview.date.tsx`
- `apps/frontend/src/components/preview/render.preview.date.client.tsx`
- `docs/ui-migration-baseline/i18n.txt`
- `docs/ui-migration-log.md` (this entry)

## Final full-app audit — 2026-08-07

Evidence-only pass across gates + authenticated browser (dev billing stage +
session). Fixed only confirmed defects; soft-outs left documented.

### Phase 0 — Gates

`scripts/ui-migration-check.sh` **PASS** (types 0; api 154; i18n 1560; routes 31;
gates 14). Frontend `:4200` / backend `:3000` smoke OK. No baseline `--update`
this pass (no key/route/API deltas).

### Phase 1 — Billing / trial / lifetime matrix

Dev billing stage @1440 (light) + code review. States exercised: `active`,
`trial`, `ended` (resubscribe + lifetime CTA), `payment_failed`, `canceling`,
`lifetime`, `lifetime_trial`. End-trial preview opens FinishTrial overlay
(pending → charged thank-you) and closes cleanly. Lifetime route shows founding
`$49` — no invented `$24.50` retention. First-checkout / portal / cancel CTAs
match stage.

**Defect fixed:** FinishTrial opened from trial-lock card without `period` /
`charged` defaulted to monthly. Now loads `/user/subscription` when those props
are omitted (`finish.trial.tsx` `useFinishTrialSubscription`).

### Phase 2 — Surfaces (420 / 1440 + themes via body class / viewport)

Checked green (no new defects): shell + mobile Menu drawer; Calendar; Channels
(+ Add Channel); Media (All / Images / Video — no ALL FILES strip); Analytics;
Auto-Plugs; AI Copilot trial lock CTA; Settings soft-open nav (Global Settings /
Teams / Notifications / API Keys / Developers / Approved Apps — **no Plugs or
Affiliate**); Connections (search + API Keys / Developers); auth login / forgot
smoke (out of redesign); `/err` smoke; lifetime deal.

Compose empty global preview: single hint only (see fix below).

### Phase 3 — Fixes shipped

1. `finish.trial.tsx` — resolve period/tier from `/user/subscription` when
   billing props missing (yearly trial thank-you amount).
2. `show.all.providers.tsx` — skip provider shells when global preview is empty
   (one hint, no hollow cards).

Re-gate after fixes: **PASS** (unchanged baseline).

### Phase 4 — Polish

Only the empty-preview shell trim above (repeated empty-channel chrome). No
invented redesigns. Auth / Media density / breakpoint retargeting not touched.

### Soft-outs reconfirmed (unchanged)

- Calendar week horizontal clip @420
- Compose footer crowding @420
- Auth / admin largely out of redesign
- Media legacy density
- Tailwind `mobile:` / `tablet:` breakpoints not retargeted

### Raises for owner

None new this pass. `scripts/ui-shot.mjs` hung with no output in this
environment (headless Chrome CDP); matrix done via IDE browser + prior
`docs/ui-shots/responsive/` corpus instead of fresh `docs/ui-shots/qa/` dumps.

### Files

- `apps/frontend/src/components/billing/finish.trial.tsx`
- `apps/frontend/src/components/new-launch/providers/show.all.providers.tsx`
- `docs/ui-migration-log.md` (this entry)

### Escape on Settings/Connect

- Settings and Connect scrims: Escape closes via the same `back` path as scrim click / X (rail keydown pattern; Soft-outs unchanged).

---

## Billing / payment deep checkup (2026-08-07)

Evidence-based pass over lifetime, cancel → ended, finish-trial, resubscribe,
`payment_failed`, Stripe webhooks, and Prisma subscription fields. Prefer false
alarms; only confirmed defects were patched. No schema / migration changes.

### Flow map (actual semantics)

**Cancel (recurring Stripe sub)**  
UI `POST /billing/cancel` → `StripeService.setToCancel` →
`cancel_at_period_end: true` (or immediate cancel if `past_due` / open invoice).
Webhook `customer.subscription.updated` writes `Subscription.cancelAt`.
When the period ends, `customer.subscription.deleted` → local row deleted →
FREE / paywall (`ended`). Reactivate toggles `cancel_at_period_end: false`
via the same cancel endpoint.

**Finish trial**  
`POST /billing/finish-trial` → Stripe `trial_end: 'now'` when a trialing sub
exists; else local `endTrial`. Deferred founding also `captureFoundingLifetimeIfDue({ force: true })` ($49). Overlay polls `GET /billing/is-trial-finished`.

**Lifetime purchase**  
`POST /billing/lifetime-checkout` → Checkout `mode: 'setup'` + deferred when
`isTrailing || allowTrial`, else `mode: 'payment'` at `LIFETIME_PRICE` (49).
Webhook `checkout.session.completed` → grant (`isLifetime` + UsedCodes ref).
Deferred fee captured at finish-trial or when the 7-day `trialWindow` has
closed (now also from `GET /user/self`).

### Confirmed correct (left alone)

- Regular cancel → `cancelAt` → deleted → FREE
- `payment_failed` webhook → in-app notification; `hasFailedPayment` read from Stripe (no local copy)
- `invoice.*` exempt from `metadata.service` filter
- Lifetime protects `modifySubscription` from Stripe plan webhooks
- FinishTrial yearly/monthly amount via billing props or `/user/subscription` lookup
- Dev billing stage is LOOK-only (`subscriptionOverride`); real SWR paths unchanged
- Code redemption `POST /billing/lifetime` + 24h `lifetimeWindow` server enforcement
- No raw SQL; Subscription model fields adequate

### Confirmed bugs fixed

1. **Founding-trial cancel was a no-op** — `setToCancel` with no Stripe sub returned `cancel_at: now` without deleting `isLifetime`. Now revokes local row + `endTrial` (+ cancels leftover Stripe subs).
2. **`customer.subscription.deleted` wiped lifetime** — `deleteSubscription` now no-ops when `isLifetime`.
3. **Mid-trial lifetime convert could double-bill** — `grantLifetimeFromPayment` cancels open Stripe subscriptions after grant.
4. **Deferred $49 never ran on natural trial expiry** — capture only lived behind FinishTrial polling. Added `settleFoundingLifetimeAfterTrial` on `GET /user/self` + fixed `is-trial-finished` (middleware-derived `isTrailing` made lazy `endTrial` dead).
5. **Finish-trial cleared trial after a failed founding charge** — do not `endTrial` when capture returns `error` / incomplete `status`.

### Raises for owner

- Failed deferred founding charge after the window closes: middleware already derives `isTrailing=false`, so the UI unlocks while `isLifetime` remains. Settle retries on `/user/self`, but a permanently dead card can leave unpaid lifetime. Product choice: revoke, keep locked until paid, or accept retries.
- FinishTrial overlay has no failure UI if the founding charge fails mid-trial (spinner until window/settle); only the flag is preserved.
- Design’s $24.50 retention offer on cancel remains intentionally unimplemented.

### Schema / migrations

**No.**

### Files

- `libraries/nestjs-libraries/src/services/stripe.service.ts`
- `libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.service.ts`
- `libraries/nestjs-libraries/src/database/prisma/subscriptions/subscription.repository.ts`
- `apps/backend/src/api/routes/billing.controller.ts`
- `apps/backend/src/api/routes/users.controller.ts`
- `docs/ui-migration-log.md` (this entry)

## Regression audit + launch polish (2026-08-07)

Evidence-only pass across Autopost, Webhooks, Media, Integrations/Signatures/Sets,
Channels, Compose, Settings/Connections, Analytics, Agents, Billing. Fixed only
confirmed defects; then a short high-traffic visual polish pass. Soft-outs left
alone.

### Surfaces verified (green)

- Autopost (list + stepped editor unlock: edit same-URL Next; create needs Send Test)
- Webhooks (list/create/edit/delete editor; APIs 200)
- Media (All/Images/Video; no ALL FILES strip; alt-text modal has no example placeholder; menu closes before lightbox/modal)
- Signatures / Social Sets / Teams / Integrations path
- Channels, Analytics, Agents, Auto-Plugs, Calendar/launches, Connections, Billing
- Settings nav: Workspace / More / Connect — **no Plugs or Affiliate** rows; API Keys split intact
- HTML titles + auth cookie smoke for the routes above (no Application error markers)

### Confirmed defects fixed

1. `autopost.tsx` — delete confirm used `data.name` (undefined; Autopost has `title`) and toast reused `webhook_deleted_successfully`. Now uses title + `autopost_deleted_successfully`.

### Visual polish shipped

- Settings list brand CTAs (Autopost / Webhooks / Signatures / Sets / Teams / API Keys “Open Connections”) → `text-pqOnBrand` (match Media Upload)
- Icon-only Edit/Delete on Autopost / Webhooks / Signatures → `title=` tooltips (design `data-tip`)
- Signatures / Sets delete toasts (and Sets delete dialog) → `t()` + English fallbacks
- Media alt/thumbnail chrome: leftover `text-textColor` / `border-tableBorder` / indigo hex slider → pq tokens / `var(--brand)`

### Soft-outs / raises left alone

- Calendar week horizontal clip @420
- Compose footer crowding @420
- Auth / admin largely out of redesign
- Media legacy density (not restyled into a new system)
- Tailwind `mobile:` / `tablet:` breakpoints not retargeted
- Browser MCP tab automation flaky this pass — route/API/HTML smoke used instead of interactive CDP

### Checks

`scripts/ui-migration-check.sh --update` then plain re-run **PASS** — types 0 ·
api 154 · routes 31 · gates 14 · i18n **1560 → 1563** (`autopost_deleted_successfully`,
`signature_deleted_successfully`, `set_deleted_successfully`).

### Files

- `apps/frontend/src/components/autopost/autopost.tsx`
- `apps/frontend/src/components/webhooks/webhooks.tsx`
- `apps/frontend/src/components/settings/signatures.component.tsx`
- `apps/frontend/src/components/sets/sets.tsx`
- `apps/frontend/src/components/settings/teams.component.tsx`
- `apps/frontend/src/components/public-api/public.component.tsx`
- `apps/frontend/src/components/launches/helpers/media.settings.component.tsx`
- `docs/ui-migration-baseline/i18n.txt`
- `docs/ui-migration-log.md` (this entry)

## Remaining launch gaps — safe fixes (2026-08-07)

Product defaults: unpaid founding = **lock-until-paid** (no revoke); **$24.50
retention** stays intentional out.

### P0 — FinishTrial failure UI
- `POST /billing/finish-trial` and `GET /is-trial-finished` surface
  `captureBlocked` (+ error/status). Unpaid deferred founding after the window
  never reports `finished: true` (no false thank-you).
- `finish.trial.tsx`: `failed` phase — payment-failed tone + Update payment
  method (portal) / Close. Poll stops on `captureBlocked`.

### P0 — Unpaid founding lock-until-paid
- `StripeService.isDeferredFoundingFeeOwed` + `/user/self`
  `lifetimePaymentPending` when deferred $49 owed and trial window closed.
- Billing strip (same look as payment_failed) + X/AI locks treat pending like
  trial lock. Settle retry on self unchanged. No revoke.

### P1 — Week @420 scroll discoverability
- Already `overflow-auto` / minmax 84px. Mobile: `overflow-x-scroll`, scroll
  today into view, edge fade, one-time “Swipe sideways for more days” hint.
  No Day auto-switch.

### P1 — Media
- Lightbox Escape + body scroll lock.
- Alt save success toast (`alt_text_saved`). Density unify / Rename still out.

### P2 — Compose footer @420
- Footer row `overflow-x-auto` + `min-w-0` / shrink-0 actions — capabilities
  stay reachable without redesign.

### Checks
`scripts/ui-migration-check.sh --update` — i18n +5 intentional:
`ft_failed_title`, `ft_failed_body`, `lifetime_payment_pending_body`,
`cal_swipe_for_days`, `alt_text_saved`.

### Files
- `billing.controller.ts`, `users.controller.ts`, `stripe.service.ts`
- `finish.trial.tsx`, `main.billing.component.tsx`, `user.context.tsx`
- `add.provider.component.tsx`, `agent.tsx`
- `calendar.tsx`, `media.lightbox.tsx`, `media.settings.component.tsx`
- `manage.modal.tsx`
- `docs/ui-migration-baseline/i18n.txt`, `docs/ui-migration-log.md`

## Launch readiness (2026-08-07)

Ship-ready stamp after titles/meta/OG polish + final gates. Soft-outs and
owner raises unchanged.

### Titles / URL / meta
- Root [`(app)/layout.tsx`](apps/frontend/src/app/(app)/layout.tsx): `metadataBase`
  from `FRONTEND_URL` (fallback `https://postqueen.com`), `title.template`
  `%s · PostQueen`, default description, icons (`favicon.ico` + `logo.svg` +
  apple `favicon.png`), `openGraph.siteName`.
- Public share [`/p/[id]`](apps/frontend/src/app/(app)/(preview)/p/[id]/page.tsx):
  `generateMetadata` from `/public/posts/:id` — title/description + OG/Twitter
  images (absolute media URLs). No more static “PostQueen Preview” / empty
  description.
- [`robots.ts`](apps/frontend/src/app/robots.ts): allow `/auth`, `/p/`; disallow
  app surfaces.
- Page titles normalized to segments (Calendar, Login, AI Copilot, …); dead
  `isGeneralServerSide` ternaries removed; `/auth/login-required`, `/err`,
  OAuth Authorize, forgot-token Reset password, Connect channel layout filled.

**Smoke:** `Login · PostQueen`, `Calendar · PostQueen`, `Error · PostQueen`,
`Login required · PostQueen`; `/robots.txt` serves allow/disallow rules.

### Polish
- Removed `console.log` in `new.uploader.tsx` and `pick.platform.component.tsx`.
- Agent empty-state already uses drawer-safe copy (no left/right menu invent).

### Prior P0 money (still in tree)
FinishTrial `captureBlocked` failure UI; `lifetimePaymentPending` lock-until-paid
+ Billing strip; settle retry. Manual Stripe matrix remains operator checklist
(success + fail FinishTrial, unpaid founding strip, cancel→ended).

### Gates
`scripts/ui-migration-check.sh` **PASS** (types 0; api 154; i18n 1568; routes 31;
gates 14). No baseline `--update` this pass.

### Soft-outs / outs (unchanged)
Week clip @420 (swipe hint shipped earlier); compose footer scroll; Media density;
auth/admin redesign; breakpoint retarget; unpaid revoke;
CREATOR yearly $132 copy Raise.

### Files
- `apps/frontend/src/app/(app)/layout.tsx`
- `apps/frontend/src/app/(app)/(preview)/p/[id]/page.tsx`
- `apps/frontend/src/app/robots.ts`
- site/auth/oauth/integrations page metadata files
- `media/new.uploader.tsx`, `pick.platform.component.tsx`
- `docs/ui-migration-log.md` (this entry)

## Cancel retention: trial %50 + lifetime $24.50 (2026-08-07)

Owner: normal trial cancel skipped the 50%×3 offer; lifetime trial had no
$24.50 founding retention (design Raise).

**Root cause (regular):** `checkDiscount` required a prior Stripe charge
`amount > 1000` — trials usually have none. Also dead null-check on
`{ data: find(...) }`.

**Fix:** Drop the prior-charge gate; gate on missing `active|trialing` sub.
Keep `STRIPE_DISCOUNT_ID`, monthly-only, no existing discount. Local/prod still
need `STRIPE_DISCOUNT_ID` set (test coupon historically `G9mLivv8`) or the offer
cannot appear.

**Lifetime trial:** confirm → Before you cancel ($24.50 copy) → Accept charges
`LIFETIME_RETENTION_PRICE` (`LIFETIME_PRICE / 2`) via off-session PaymentIntent,
records `lifetime-charge:` + `lifetime-retention:` so `$49` capture cannot
double-bill, then `endTrial`. Decline → feedback → cancel (existing revoke path).
`POST /billing/apply-lifetime-retention`.

**UI:** `BillingCancelDialog` branches on `offerLifetimeRetention` vs
`offerDiscount`; mutates `/user/subscription` + `/user/self` on apply.

**Checks:** `scripts/ui-migration-check.sh --update` then PASS (types 0; api 155;
i18n 1572; routes 31; gates 14). `STRIPE_DISCOUNT_ID` present in local `.env`.

## Media density + calendar published + favicon (2026-08-07)

Owner: Media felt denser than prototype (missing search / ALL FILES / captions);
past calendar cards showed SCHEDULED + grayscale (draft-like); favicon had white
corner triangles on dark tabs.

### Media
- Rename confirmed absent (alt text only); Raise docs → omitted.
- Restored design density on `/media` standalone: search, All files + count,
  grid `gap-y-18` + name/meta captions, lightbox filename `15/600`.
- Compose picker unchanged.

### Calendar
- Demo past `QUEUE` → `PUBLISHED` when materializing.
- Week/day/month: drop card `grayscale`; published `--ok` accent + Published chip;
  soft ok inset ring. Real past QUEUE stays Scheduled (honest). Empty past cells
  keep hatch / Date passed.

### Favicon
- Regenerated transparent `favicon.png` / `favicon.ico` from `logo.svg` (corner
  alpha 0). Apple touch = full-bleed `#7c3aed` 180px. Metadata prefers SVG first.

### Gates
`scripts/ui-migration-check.sh --update` **PASS** (types 0; api 155; i18n 1574;
routes 31; gates 14).

### Files
- `media.box.tsx`, `media.lightbox.tsx`
- `calendar.tsx`, `calendar.context.tsx`
- `apps/frontend/public/favicon.*`, `apple-touch-icon.png`
- `(app)/layout.tsx` icons
- `docs/ui-fidelity-audit/MASTER.md`, `rail-pin-media-lightbox.md`

## Title branding + past Published + Media strip (2026-08-07)

Owner: Agents tab/chrome felt unbranded vs Analytics; past seeded QUEUE cards
still showed SCHEDULED; Media density restore brought back search / ALL FILES /
filenames the owner wanted gone.

### Titles
- Agents metadata kept once on `agents/layout.tsx` (deduped page copies).
- `(provider)` / `(extension)` layouts gain the same `default` +
  `template: '%s · PostQueen'` as `(app)`.

### Calendar
- `displayPostState`: past `QUEUE` renders Published chip + ok accent (API state
  unchanged; matches drag “already published” dialog).
- Seeds: past QUEUE → `PUBLISHED` (`seed-dev-posts` / `seed-dev-workspace`).

### Media (`/media` standalone)
- Density restore reverted for names/search/count: no search, no ALL FILES strip,
  no filename/meta captions under grid thumbs (video duration badge kept).
- List view unchanged (Alt / Format / Date / Size).
- Lightbox: generic “Media” title — no filename; type/size meta kept.
- Compose Insert Media picker untouched.

### Gates
`scripts/ui-migration-check.sh --update` then PASS. i18n drops unused
`all_files`, `search_by_file_name`.

### Files
- `agents/page.tsx`, `agents/[id]/page.tsx`, `(provider)/layout.tsx`,
  `(extension)/layout.tsx`
- `calendar.tsx`, `scripts/seed-dev-posts.mjs`, `scripts/seed-dev-workspace.mjs`
- `media.box.tsx`, `media.lightbox.tsx`
- `docs/ui-migration-baseline/i18n.txt`, this log

## Media picker: duplicate attach + selection audit (2026-08-07)

Owner: re-adding the same library asset produced React duplicate-key console
errors; reopening Insert Media did not show already-attached items as selected.

### Root cause
`MultiMediaComponent.changeMedia` blindly appended; picker had no
`attachedMedia` awareness; max-5 counted only the current picker session.

### Shipped
- Deduped append by `id`; React list keys `${id}-${index}` as belt-and-suspenders.
- `MediaBox` takes `attachedMedia`: ✓ badge, toast on re-click, excluded from Add
  payload; max-5 includes attached + selected (+ upload auto-select).
- Delete clears `selected` + `accumulated` (no ghost / dead Add refs).
- `closeModal()` wired for `ShowMediaBoxModal`; `showMediaBox` / bot picture take
  an **array**.
- ReactSortable + alt-text update local `currentMedia` and use prop `name`.
- Single `MediaComponent`: sync `value`, `mediaDirectory.set` preview,
  `changeMedia` deps.

### Gates
`scripts/ui-migration-check.sh` PASS (i18n 1573 incl. `media_already_on_post`).

### Files
- `media.component.tsx`, `media.box.tsx`, `bot.picture.tsx`
- this log

## Lifetime always grants Pro (2026-08-07)

Owner: founding ($49) was still laddering one tier up (`lifetimeLadder` /
`nextLifetimeTier`), so Growth/Pro/Ultimate trials saw matching lifetime cards
and Pro/Agency grants could climb to Agency. Rule: **Lifetime = always Pro**
(30 channels, `pricing.PRO`).

### Shipped
- `LIFETIME_GRANT_TIER = 'PRO'`; `nextLifetimeTier()` always returns it;
  `lifetimeLadder` removed.
- `grantLifetimeFromPayment` + `lifetimeDeal` (+ compiled `.js` +
  `grant-lifetime.mjs`): always Pro, always `pricing.PRO.channel` — no floor /
  equal-tier +5.
- Billing trial upsell: Pro copy/features; badge above title; price top-right.
- `lifetime.deal` + First Billing: grant preview / features use
  `LIFETIME_GRANT_TIER`.

### Raise
Existing lifetime rows (e.g. Agency/Creator from the old ladder) are **not**
backfilled — only new grants use Pro. Owner decides if a one-off migrate is
wanted.

### Gates
`scripts/ui-migration-check.sh --update` then PASS (types 0/0; api 155; i18n
1573; routes 31; gates 14).

### Files
- `pricing.ts` / `.js`, `stripe.service.ts` / `.js`, `scripts/grant-lifetime.mjs`
- `main.billing.component.tsx`, `lifetime.deal.tsx`, `first.billing.component.tsx`
- baselines + this log

## Critical billing audit harden (2026-08-07)

Audit PASS: **lifetime = Pro** (grant paths + upsell UI). `member_no_plan`
maps to the ask-admin gate (`BillingAdminRequiredComponent`), not First Billing
/ plan picker. Raise G unchanged — existing non-Pro lifetime rows are not
backfilled.

### Verify
- Layout gate (`layout.component.tsx`): FREE + non-ADMIN →
  `BillingAdminRequiredComponent` (“A subscription is needed”).
- Root now `min-h-0 flex-1` under `h-dvh overflow-hidden` so the screen paints
  (same flex pattern as First Billing paywall).
- DEV state label: `member_no_plan (ask admin)`.
- Marker: `data-pq-admin-required="1"`.

### Cleanup
- Stale “ladder” comments in `stripe.service.ts` / `.js`, `first.billing`,
  `grant-lifetime.mjs`.
- `grant-lifetime.mjs`: channels always `GRANT_CHANNELS` (30).
- `nextLifetimeTier` stub kept (always Pro).

### Calendar (same pass)
SCHEDULED (`QUEUE`) status chips get a purple `bg-pqFocused` dot matching
PUBLISHED’s green `bg-pqOk` pattern (day + week cards). `displayPostState`
unchanged.

### Gates
`scripts/ui-migration-check.sh` PASS (types 0/0; api 155; i18n 1573; routes 31;
gates 14). No `--update`.

### Files
- `billing.admin.required.component.tsx`, `dev-billing-stage.switcher.tsx`
- `stripe.service.ts` / `.js`, `first.billing.component.tsx`,
  `scripts/grant-lifetime.mjs`
- `calendar.tsx`, this log

## Media Library modal redesign (2026-08-07)

**Owner:** Insert Media / Media Library sheet still looked like the old picker
(wide thin drop strip, bare thumbs, weak gray helper copy) despite prior asks.
Earlier passes intentionally left the compose picker “untouched” while stripping
`/media` search / ALL FILES / filenames — that is why the modal lagged.

**Shipped (MediaBox picker + shared captions):** type · size under gallery
thumbs; tall dashed drop zone matching `/media` LOOK + readable
`text-pqText` / `text-pqMuted` copy; no re-add of search / ALL FILES / filenames
on standalone `/media`. Compose attached strip is a separate component (no
`fileSize` on attach payload) — not redesigned here.

**Gates:** `scripts/ui-migration-check.sh --update` — drop unused
`you_can_drag_drop_pictures` (picker drop zone now uses Media-page 1 GB copy).

### Files
- `apps/frontend/src/components/media/media.box.tsx`
- `docs/ui-migration-baseline/i18n.txt`
- this log

## Media page + picker selection polish (2026-08-07)

**Owner:** `/media` wasted space under the title and put All/Images/Video +
grid/list above the drop zone; Insert Media had a blank strip between filters
and thumbs (idle Uppy bar) plus a heavy purple ring + check badge.

### Shipped
- **Standalone `/media`:** Upload row → drop zone → filter+view toolbar →
  gallery. Tighter top padding (`pt-[8px]`). Type L / size R meta kept; no
  search / ALL FILES / filenames restored.
- **Picker:** Uppy progress collapses when idle; filters sit `gap-[8px]` above
  the grid. Selected thumbs use a 1px brand outline + top-start numbered badge
  (selection order 1…5); already-attached keeps a small check.
- Hover kebab / alt-text menu / captions unchanged.

### Files
- `apps/frontend/src/components/media/media.box.tsx`
- this log

## Media select copy + upload feedback (2026-08-07)

**Owner:** Hitting the Insert Media 5-cap showed helper copy as an error
(`Select or upload pictures…`) — wrong tone and “pictures” when video is
allowed. Drag-to-upload used a near-black `bg-black/90` overlay (kapkaranlık).
Upload complete had weak/missing success feedback.

### Findings (limit of 5)

| Source | Behavior |
|--------|----------|
| `origin/main` `media.box` `addRemoveSelected` | **No hard cap** — select freely |
| `origin/main` Uppy `maxNumberOfFiles: 5` | **Commented out** (soft guidance only) |
| Current picker (UI migration 2026-08-06) | Hard cap: `selected.length + attachedCount >= 5` — **post-level total** (already-attached on the post counts), not merely “5 per picker session” |
| Helper string historically | Soft copy “maximum 5 at a time” — not enforcement |

**Provider `checkValidity` media caps (not a product-wide 5):**

- Instagram carousel: up to **10**
- X: max **4** images or **1** video
- Bluesky: max **4** images or **1** video
- Pinterest: max **5** images (or video + cover = 2)
- Tumblr: up to **30** images
- Telegram media groups: **10** per group
- LinkedIn: carousel ≥2 images; video = max 1
- Facebook: photos or one video (stories: each media separate)

### Raise (owner decision needed)

**Do not silently raise the picker cap.** Original app had **no hard picker limit**;
platforms allow more than 5 (notably Instagram 10, Tumblr 30). The migration-era
hard 5 is a UX guardrail, not a platform rule. Recommend: keep 5 until owner
picks a higher shared cap (e.g. 10 to match Instagram) or per-provider limits in
the composer — then raise in a dedicated change.

### Shipped

1. **Toast:** New keys `media_select_max` / `media_select_max_with_attached` —
   accurate post-level wording; no longer reuses helper string. Uses “media”.
2. **Helper:** `select_or_upload_pictures_max_5` English → “Select or upload media
   (maximum 5 for this post).” (key kept).
3. **Drag overlay:** `DropFiles` and compose editor drop hint use brand-faint +
   inset brand ring (design `isMedia` drag) — removed `bg-black/90` / `bg-black/70`.
4. **Upload feedback:** Drop zone shows “Uploading media…” + spinner while busy;
   light Uppy progress strip (`.uppyChange` token chrome); success toast on
   complete (`media_upload_complete` / `_one` + `upload_complete` title).

### Gates

`scripts/ui-migration-check.sh --update` after new i18n keys.

### Files

- `apps/frontend/src/components/media/media.box.tsx`
- `apps/frontend/src/components/layout/drop.files.tsx`
- `apps/frontend/src/components/new-launch/editor.tsx`
- `apps/frontend/src/app/global.scss`
- `libraries/react-shared-libraries/src/translation/locales/en/translation.json`
- `docs/ui-migration-baseline/i18n.txt` (via --update)
- this log


## Media delete success toast (2026-08-07)

**Owner:** Deleting media (kebab / lightbox) removed the tile with no success feedback.

**Shipped:** On `DELETE /media/:id` success, toast `media_deleted` (“Media deleted”).
On failure, existing `something_went_wrong` warning. Optimistic grid remove unchanged.

**Checks:** `scripts/ui-migration-check.sh --update` for new `media_deleted` i18n key.

**Files:** `apps/frontend/src/components/media/media.box.tsx`, baseline i18n, this log.


## Fix Media Library upload + restore original pick limit (2026-08-07)

**Owner:** Insert Media modal looked broken — translucent purple “Drop files to
upload” panel over thumbs (“yarım / bozulmuş”). Root cause: picker inherited
`/media`’s tall idle strip **and** wrapped the whole modal (gallery + footer) in
`DropFiles` `brandOverlay` (`bg-pqInner/95`), so drag cover sat on top of the
grid. Design `libraryOpen` has neither; tall strip + page drag cover belong only
to standalone Media (`isMedia`).

Hard select cap of 5 was a migration guardrail — `origin/main` had **no** hard
picker limit (copy-only). Platforms allow more (e.g. Instagram 10).

### Shipped

1. **Picker (`!standalone` / `libraryOpen`):** Removed tall idle dashed strip.
   Structure: helper + Upload → filters → gallery → footer. `DropFiles` scoped
   to the toolbar only (no `brandOverlay`) so a drag cover never overlays thumbs.
   Upload still works via Upload button, paste, OS browse, and toolbar drop.
2. **Standalone `/media` (`isMedia`):** Unchanged idle layout (Upload → in-flow
   dashed strip → filters + gallery). Page-level `brandOverlay` kept with
   `inset-[12px]`.
3. **`drop.files.tsx`:** Overlay fill is solid `bg-pqInner` (not `/95`); removed
   backdrop-blur that still revealed thumbs. `brandOverlay` still means inset-12.
4. **Hard-5 removed:** Deleted `selected.length + attachedCount >= 5` gate and
   upload auto-select `slice(0, room)`. Helper → `select_or_upload_media`
   (“Select or upload media.”). Dropped unused `media_select_max` /
   `media_select_max_with_attached` / `select_or_upload_pictures_max_5` usage.
   Provider `checkValidity` caps untouched.

### Gates

`scripts/ui-migration-check.sh --update` — types clean; i18n key list reflects
helper rename and removed max toasts; baseline also refreshed to current WIP
branch surface (api / routes / gates).

### Files

- `apps/frontend/src/components/media/media.box.tsx`
- `apps/frontend/src/components/layout/drop.files.tsx`
- `libraries/react-shared-libraries/src/translation/locales/en/translation.json`
- `docs/ui-migration-baseline/*` (via --update)
- this log


## Critical + Major fix sprints (2026-08-07)

Audit backlog Critical/Major closed in four sprints. Out of scope (Raise):
G backfill, CREATOR $132, cancel-date, groupCell, Keyboard unlock, streak
Longest, week @420 clip.

### A — Critical
- **Tour sticky query:** `finish` / Skip / Esc / scrim `router.replace` strips
  `tour` + `onboarding`. Soft URL auto-start skips when `tourSeen()`; Help →
  Setup still calls `start()` directly. Finish → `/channels?add=1` unchanged.
- **First Billing lifetime:** card / mode only when
  `lifetimeWindow(createdAt).open || user.isTrailing`. `LifetimePayBar` toasts
  API `message` on `!res.ok` (410 offer closed).
- **/media empty:** `showEmptyState` only swaps gallery body; drop zone +
  All/Images/Video + view toggle stay (no filter trap on blank library).

### B — Touch / overlay / validation
- Media grid kebabs + compose thumb controls: `data-ci-actions` (mobile /
  `hover:none` visibility). Ghost thumbs get `.dragging` for reorder.
- Editor drag overlay: solid `bg-pqInner` + brand ring (matches `DropFiles`).
- Validation chip: details always open when invalid; tap toggle when valid +
  global limits.
- Dead `select_or_upload_pictures_max_5` removed from locales; Uppy hard-5
  comment cleaned.

### C — Tour mobile / RTL + dead modal
- Mobile: `connect-pq` / `nav-channels` open the rail drawer so spotlight
  targets exist.
- RTL: `place()` + caret mirrored for `dir=rtl`.
- Deleted unmounted `onboarding.tsx` / `onboarding.modal.tsx` (dead hex CTAs).
  Status table → tour-only first-run.

### D — QUEUE honesty + upload clarity
- Calendar / list Edit uses **API** state (`QUEUE` stays editable even when
  display paints Published for past slots). Posts panel already used API state
  and keeps past QUEUE as Scheduled — Raise if design wants panel display map.
- `.env.example`: `UPLOAD_VIA_SERVER` CORS note; prod default stays commented
  (do not flip).

**Checks:** `scripts/ui-migration-check.sh --update` then plain — PASS
(types 0/0; api 155; i18n 1569; routes 31; gates 14).

## Settings/Connections scrim: cover header, no stack (2026-08-07)

**Owner:** Settings / API Keys / Connect felt “squashed”; page chrome h1
“Settings” / “Workspace, publishing…” stayed visible around the sheet.

**Root cause:** Hard `/settings` (and `/connections`) rendered the fixed scrim
as `(site)` `children` inside `.blurMe` (`z-0`, below the header). Soft
intercept already mounts the sheet in the `overlay` slot outside AppChrome —
hard load did not. Card `h-[min(680px,100%)]` then sized to the content column
under the header. Soft-push from hard Settings → `(.)connections` also kept
Settings mounted as children under the new intercept (stacked sheets). Design
`goConnections` closes Settings first.

**Fix (LOOK / layer only):**
- `RouteOverlayScrim` portals Settings + Connect scrims to `document.body`
  (`mode=page` | `intercept` on the route files).
- `leaveSettingsFor`: hard page (`data-route-mode=page`) → `location.assign`
  so Connections does not stack; soft intercept still `router.push`.
- Hard overlay blanks header title/subtitle via `useChromeLocation.isHardOverlay`.

**Files:** `leave-settings.tsx`, `settings.component.tsx`, `connect-panel.tsx`,
`use-chrome-location.ts`, `title.tsx`, `@modal/(.)settings|connections`,
`settings/page.tsx`, `connections/page.tsx`.

## Launch finish: panel smart default + media picker rows (2026-08-07)

**Posts panel smart tab:** Shared `listState` defaulted to `'all'` (List toolbar
owner default). Panel has no All tab; `state=all` hides past drafts
(`publishDate >= now`). Panel now uses separate `panelListState`. On first open
(and on org/customer change) probes `GET /posts/list?state=…&limit=1` —
scheduled → draft → published. Manual tab clicks stick. List All untouched.

**Insert Media picker:** Grid viewport capped to ~2 thumb rows
(`max-h-[min(280px,32vh)]`); pagination moved outside the scroll so page
controls are visible without scrolling the sheet.

**Settings/Connect overlay:** Verified WIP — `RouteOverlayScrim` portals to
`document.body`; hard leave uses `leaveSettingsFor` → `location.assign`. No
further LOOK change this pass.

**Intentional defer (launch):** CREATOR yearly **$132** stays; **Raise G**
(lifetime backfill, cancel-date, groupCell, keyboard unlock, week @420 clip)
deferred.

### Checks

`scripts/ui-migration-check.sh` — PASS (types 0/0; api 155; i18n 1569; routes
31; gates 14). No `--update` needed.

### Files

- `calendar.context.tsx`, `posts.panel.tsx`
- `media.box.tsx`
- `leave-settings.tsx` (verified)
- this log
