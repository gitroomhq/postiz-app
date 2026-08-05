# Billing photo fixture — 14 states × 2 themes

Batch C close-out. Source of the matrix: `design/handoff/03-billing-and-gating.md`
(Test matrix). Visual inventory / delta backlog: `docs/ui-fidelity-audit/billing.md`.
Status board: `docs/ui-fidelity-audit/MASTER.md`.

**Do not invent Stripe prices or change billing logic for this fixture.** Shoot what
the repo renders. Product/copy questions below are **Raise** / **Intentional skip**,
not LOOK fixes.

---

## Viewport & themes

| Item | Value |
| --- | --- |
| Primary viewport | **1440** (desktop) — shoot every cell here first |
| Optional follow-ups | 900 / 420 only when a cell’s layout is known to reflow (paywall columns, plan grid, cancel strip) |
| Themes | `.light` and `.dark` on `<body>` — **every cell × both** → 28 primary shots |
| Tooling | `scripts/ui-shot.mjs` with session cookie; fail if URL redirects to `/auth` |
| Out dir (suggested) | `docs/ui-shots/billing-fixture/<nn>-<slug>-1440-<light\|dark>.png` |

---

## What each shot must prove

From the billing audit inventory (`billing.md` §A / §D), the fixture is not “one
happy /billing page” — it is every **distinct rendering** of strips, plan grid /
lifetime surface, and paywall shell. Across the 14 cells, confirm:

1. **Plans page chrome** — centred `max-width:1080` column, “Plans” header, period
   toggle + planMeta, plan grid (or lifetime surface), portal/cancel row, FAQ.
2. **Conditional strips** — lifetime upsell (trial), trial banner, payment-failed
   (red), discount (green), cancel-notice (orange + Reactivate).
3. **Paywall / checkout** — full-shell checkout (`not_started`, `ended`), order
   summary / Due today, trust row, payment card; admin-required centred state.
4. **Lifetime surfaces** — paid founding hero + Current/Next package; founding
   trial banner; purchase / offer page (no scarcity counter — see skips).
5. **Tier LOOK differences** — CREATOR entry cards, GROWTH/PRO current ring,
   AGENCY gradient + violet ring, MOST POPULAR on PRO.

Compare against prototype `pagesVals` / paywall markup regions cited in
`billing.md`. Behaviour, Stripe amounts, and gate conditions stay on the **code**.

---

## Raises (product) — do not “fix” in LOOK

| Item | Why | Status |
| --- | --- | --- |
| **CREATOR yearly $132** | Design table is 6.6× monthly; GROWTH/PRO/AGENCY are 8×. Resolve before treating yearly CREATOR price as a LOOK bug. Do **not** invent a Stripe price ID. | **Raise (product)** |
| **“Months free” copy** | Prototype “{n} months free” / “4 months free” vs repo coupon honesty (`billing_20_percent_off` / `monthsFree()`). Copy must match what Stripe actually grants. | **Raise (product)** |

---

## Intentional skips

| Item | Why | Status |
| --- | --- | --- |
| **Lifetime scarcity counter** (“N of 200 left” / LAST CHANCE seat chip) | No backend seat pool; a counter to nothing is a lie. Purchase / 24h window UI may exist; the scarcity chip does not. | **Intentional skip** |
| Dated amber “subscription ended on {date}” when client has no date | Do not invent a date for the shot. | Intentional (see MASTER / migration log) |

---

## Checklist — 14 cells × light/dark

Handoff prose says these 14 cover every distinct rendering (vs 4×10×2 = 80). The
tier×state list in doc 03 enumerates **13** admin/member subscription cells;
**#14** is the founding-member **purchase** surface on `/billing/lifetime` (offer
open, not yet `isLifetime`), which that doc treats separately from
`lifetime` / `lifetime_trial` and is where the scarcity skip applies.

Paths under `apps/frontend/src/components/billing/` unless noted.

| # | Cell | Route / how it mounts | Primary components | Light | Dark | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | **CREATOR × not_started** | Shell replaced (FREE org, admin) — any app URL → paywall | `first.billing.component.tsx`, `embedded.billing.tsx`, `faq.component.tsx` (via layout `FirstBillingComponent`) | [ ] | [ ] | Checkout; plan picker default CREATOR; Due today / trial CTA per `allowTrial` |
| 02 | **CREATOR × trial** | `/billing` | `billing.component.tsx` → `main.billing.component.tsx`, `finish.trial.tsx`, `faq.component.tsx` | [ ] | [ ] | Trial banner + optional lifetime upsell strip; End free trial |
| 03 | **CREATOR × active** | `/billing` | `billing.component.tsx` → `main.billing.component.tsx`, `faq.component.tsx` | [x] | [x] | Shot 2026-08-05 `docs/ui-shots/billing-fixture/03-creator-active-1440-*` |
| 04 | **CREATOR × ended** | Shell paywall, lapsed | `first.billing.component.tsx`, `embedded.billing.tsx` | [ ] | [ ] | “Pick up where you left off”; no trial checkmarks; full price due |
| 05 | **GROWTH × active** | `/billing` | `main.billing.component.tsx` (+ `billing.component.tsx`, `faq.component.tsx`) | [ ] | [ ] | Current GROWTH; team-tier feature list |
| 06 | **GROWTH × canceling** | `/billing` | `main.billing.component.tsx` | [ ] | [ ] | Orange cancel-notice + Reactivate; tier kept |
| 07 | **PRO × active** | `/billing` | `main.billing.component.tsx` | [ ] | [ ] | MOST POPULAR badge; brand current ring |
| 08 | **PRO × discount** | `/billing` | `main.billing.component.tsx` | [ ] | [ ] | Green “% discount active” strip + struck/new price |
| 09 | **PRO × payment_failed** | `/billing` | `main.billing.component.tsx` | [ ] | [ ] | Red payment-failed strip (not amber); Update CTA |
| 10 | **PRO × lifetime** | `/billing` (paid founding) | `main.billing.component.tsx` + `lifetime.deal.tsx` (`FoundingMember`, `LifetimePackages`) | [ ] | [ ] | Lifetime hero + Current/Next package; no plan grid |
| 11 | **PRO × lifetime_trial** | `/billing` | `main.billing.component.tsx`, `finish.trial.tsx`, `lifetime.deal.tsx` pieces as wired | [ ] | [ ] | Founding trial banner (`ltChip` styling) + lifetime-aware meta |
| 12 | **AGENCY × active** | `/billing` | `main.billing.component.tsx` | [ ] | [ ] | AGENCY card gradient + violet ring; unlimited channels treatment |
| 13 | **any × member_no_plan** | Shell replaced (non-admin, no sub) | `billing.admin.required.component.tsx` | [ ] | [ ] | Centred admin-required; org switcher + logout; no plan picker |
| 14 | **Founding purchase** (offer open) | `/billing/lifetime` | `lifetime.deal.tsx` (`LifetimeCountdown`, `LifetimePackages`); page `app/(app)/(site)/billing/lifetime/page.tsx` | [ ] | [ ] | 24h window UI OK; **no** scarcity “N of 200” chip (**Intentional skip**) |

Also used across cells (not a separate matrix row):

- `billing.component.tsx` — admin gate + SWR; non-admin on `/billing` with a plan is the in-page admin-only empty (related to #13).
- Route shell for Plans: `app/(app)/(site)/billing/page.tsx` (`max-w-[1080px]` column).

---

## Shot pass criteria (per cell)

- [ ] Correct strip / surface for that `billingState` (no wrong banner stacked).
- [ ] Theme tokens only (no leftover `bg-sixth` / `newBg*` / raw red-500 where audit cleared them).
- [ ] No horizontal overflow at 1440.
- [ ] i18n: English fallbacks OK for the shot; do not hardcode prototype-only strings into the app for the photo.
- [ ] Prices on cards match **repo** `pricing.ts` / live Stripe nicknames — if CREATOR yearly shows \$132, record it; do not “correct” to 8× in code without a product decision (**Raise**).

---

## Related audit deltas (LOOK backlog — not this fixture’s job)

Full checkbox list remains in `billing.md` §C / paywall §. This fixture only
**photographs** the 14×2 matrix so gating/LOOK cannot silently regress. Wire later
into Playwright/Storybook per handoff doc 06 §E.


---

## Shot status (2026-08-05 close pass)

DEV billing stage switcher removed — only real account states are shootable.

| # | Light | Dark | Status |
| --- | --- | --- | --- |
| 01 | — | — | blocked: FREE / not_started shell |
| 02 | — | — | blocked: trial (`isTrailing`) |
| 03 | [x] | [x] | `03-creator-active-1440-{light,dark}.png` — Match chrome |
| 04 | — | — | blocked: ended / lapsed paywall |
| 05 | — | — | blocked: GROWTH active |
| 06 | — | — | blocked: canceling |
| 07 | — | — | blocked: PRO active |
| 08 | — | — | blocked: discount |
| 09 | — | — | blocked: payment_failed |
| 10 | — | — | blocked: lifetime paid |
| 11 | — | — | blocked: lifetime_trial |
| 12 | — | — | blocked: AGENCY active |
| 13 | — | — | blocked: member_no_plan |
| 14 | — | — | blocked: `/billing/lifetime` redirected to `/billing` (offer closed) |

Probe: no `bg-sixth` / `newBg*` in live `/billing` HTML. FAQ + Plans + MOST POPULAR + portal row confirmed on CREATOR active.
