# UI redesign notes

PostQueen’s frontend visual redesign uses a local handoff under
`design/handoff/` (gitignored — unreleased design material). If that folder is
missing from your checkout, ask the maintainers rather than guessing.

**How it looks** comes from the design. **How it works** (routing, APIs,
validation, feature gates, i18n) comes from this repository.

## Prove a restyle broke nothing

```bash
scripts/ui-migration-check.sh
```

Six checks, all against `docs/ui-migration-baseline/`:

| check | what it holds |
|---|---|
| `types` | both apps compile |
| `api` | the set of backend endpoints the frontend calls |
| `i18n` | the translation key set — none dropped, none invented |
| `routes` | the page list |
| `gates` | feature-gate call sites, counted (a gate falling from two to one is the half-removal this catches) |
| `loops` | indefinite animations with no way to switch off for `prefers-reduced-motion` — **empty by design**, any entry is a regression |

It runs in CI on every push (`.github/workflows/build.yml`), before the build. If a
change is *meant* to move a list, run `--update`, **commit the baseline**, and say
why here and in the PR. A baseline file that is absent rather than different fails
the check: an uncommitted one would reseed itself on every CI run and guard nothing.

## Log

**Paid founding Billing is one surface.** `/billing` and `/billing/lifetime` were leftover pages (Plans + FAQ vs a deal hero with no FAQ). Paid founding members now share `FoundingPaidSurface` (heading, member-since, Stripe portal, FAQ). `/billing/lifetime` stays as the unpaid purchase page. Gates `isTrailing` 18 → 19, `user.isLifetime` 24 → 25 (one extra read on the shared paid stack). `scripts/ui-migration-check.sh --update` rewrote `gates.txt`.

**Account / Teams visual pass.** Settings pane titles used Tailwind `mobile:hidden` (1025px) while the back-arrow chrome keys off `useViewport().mobile` (760px), so 761–1025px Settings (Account, Teams, Global Settings) had no heading. Title now hides only with the JS phone chrome. Delete Account password placeholder no longer truncates at 420px (short field + helper). Teams Role/Actions columns are narrower so the header stays on-screen at 420. i18n swapped `current_password_or_oauth` for `delete_account_password_hint`. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

**Account load-failed copy.** Account settings now has an explicit retry state when `/user/identities` fails (`account_load_failed`). Intentional i18n +1. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

**Account settings, identities, and team roles.** Account is the first Account-group row (`?tab=account`): name, email change, password, connected OAuth, Delete Account (moved off Global Settings). Workspace name is SUPERADMIN-only on Global Settings. Teams gained a Role column, USER/ADMIN change, ownership transfer, and leave. Intentional inventory change: Account nav unhidden; new fetches (`/user/password`, `/user/email/*`, `/user/identities`, `/settings/organization`, `/settings/team/transfer`, `/settings/team/leave`, PATCH `/settings/team/:id`); i18n keys for those screens; dropped the unused `delete_your_account` / `request_account_deletion` / `detect_timezone` copy from the old hidden pane. `scripts/ui-migration-check.sh --update` rewrote `api.txt` and `i18n.txt`.

**Founding Billing still opens the Stripe portal.** PR 150 removed the code-claim cards, not the `/billing` portal row — but `/billing/lifetime` had no payment-method surface, founding copy only said “download the receipt”, and Settings → Plan & invoices hid the portal for lifetime. Founding members now get the same “Payment method & invoices” row (card, tax IDs, receipts) plus an empty recurring-invoice line. i18n −1 (`portal_row_sub_lifetime`). Gates `user.isLifetime` 22 → 24. `scripts/ui-migration-check.sh --update` rewrote `i18n.txt` and `gates.txt`.

**Lifetime code claim is gone.** Nobody will have codes; Ultimate is gifted by email or from the system. `/billing/lifetime` and Billing still sell founding ($99 once) and show founding-member status. Removed the EXTRA vs Pro comparison, code input, Claim, `POST /billing/lifetime`, and `LifetimeDto`. i18n −5 from `t()` (`claim`, `current_package`, `enter_your_code`, `lifetime_grants`, and `label_code` on that form — `label_code` stays in locales for the OTP email step). Gates `tier.current` 17 → 16, `user.isLifetime` 23 → 22 (the claim cards were the extra reads). `scripts/ui-migration-check.sh --update` rewrote `api.txt`, `i18n.txt`, and `gates.txt`. Route `/billing/lifetime` stays.

**Getting started lives in the sidebar footer, not a Settings overlay.** A compact progress row above the org switcher opens a popover on desktop and a `MobileSheet` on touch: connect a channel, create a post, publish a post. Instant publish (calendar, MCP, n8n) also ticks the schedule step so nobody is asked to fake a queued post. The widget waits until the probes land so an account that already finished does not flash 0/3, then an all-set card can be dismissed per org. Help → Take a tour hides once the checklist is complete, not merely after a published post. i18n +10 (`getting_started`, `youre_all_set`, `getting_started_channel`, `getting_started_schedule`, `getting_started_publish`, `getting_started_channel_hint`, `getting_started_schedule_hint`, `getting_started_publish_hint`, `getting_started_done`, `got_it`). Reused `add_channel`, `create_new_post`, `take_a_tour`.

**Notification panel: contrast, Reconnect, and typed CTAs.** Dark-theme Mark all read used `--brand` (#7c3aed) on `--inner` (~3.3:1). It now uses `--focused`. Refresh-token errors stored `$FRONTEND_URL/launches` and the row said "Open link" as if the channel were a published post. New copy is reconnect-toned, the CTA is Reconnect, and it lands on `/channels?channel=&focus=` so that channel is selected. Existing rows with the old blob are rewritten in the panel. Error/warning rows get a left-side icon distinct from the publish-success check. i18n +3 (`open_channel`, `open_calendar`, `no_notifications_hint`). `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

**Calendar Posts rail opens on a tab that actually has rows.** The welcome probe read `total` on a minified `/posts/list` body (`t`), so every tab looked empty and the rail stayed on Scheduled. It now expands that payload and picks scheduled → drafts → posted → scheduled, and holds the list fetch until that pick lands so the rail does not flash empty. i18n 0.

**Deleting a post left the row on screen until a full reload.** Toast said it was gone because DELETE succeeded, but the list/calendar SWR hooks only bound-mutated the fetch that is currently keyed — the other view is `null` and `keepPreviousData` kept the row. Delete now drops the group from every `/posts-` cache immediately, then revalidates. i18n 0.

**Composer Copilot is the footer AI control on every viewport.** Merging `main` into the phone/tablet native PR replaced the desktop-only floating Copilot chip with `ComposeAiAssistant` in the composer footer. Phone and tablet keep Edit/Preview tabs and the stacked footer. i18n 0.

**Touch viewport no longer re-renders the app on every resize pixel.** `useViewport()` is on calendar cards, chrome, composer, Settings. Listening to `resize` rebuilt that tree while a window was dragged. It now uses `matchMedia` and only updates when phone/tablet/desktop actually changes. Post HTML5 drag keys off `touch` (not a stale `innerWidth`). The composer’s Copilot chip loads only on desktop. i18n 0.

**Clipped Settings/Connect cards and composer footer on phone and tablet.** The overlay sat at z-90 under the header/rail and used 20px padding below 1180px, so search and nav were cut off and Create Post painted on the card. Phone composer’s “Check the circles above…” CTA wrapped over Repeat/Date. Overlay is now z-220 and edge-to-edge on `touch`; tablet cards fill the scrim; the footer stacks date above the actions and reuses `select_channels`. i18n 0.

**Phone native UX (viewport, sheets, Settings stack, calendar agenda, composer tabs).** The redesign already had a 760px drawer, but Settings capped nav at 132px, week/month stayed 7-column grids, and the composer stacked a 340px preview on the editor. Phone now uses `viewport-fit: cover` + safe-area utilities, a shared `MobileSheet`, edge-to-edge modals, an iOS-style Settings/Connect push stack, week-as-day-chips + agenda, month as a compact date picker, Edit/Preview composer tabs, and 44px taps. i18n 0 — reused existing keys (`back`, `close`, `edit`, `preview`, `move`, `posts`, `date`).

**Stripe finalize pass: what turning tax on broke, and what the webhook hardening
got wrong.** A review of the pass below found real defects *in that pass*. They are
listed here because the mistakes are more instructive than the fixes.

*Tax had to be shown.* Prices are `tax_behavior: 'exclusive'`, so with a registration
in place an EU customer's total went up while the order summary still listed only the
plan price — a `$49.00` line above a `$60.76` total with nothing in between. The code's
own comment beside the trial-credit line already argues the point: *"one number that
contradicts the price above it reads as a mistake."* `PriceBreakdown` now renders
`checkout.total.taxExclusive` **always, including at zero**, because `Tax $0.00` tells
an American customer the tax was considered and does not apply, whereas an absent line
next to a higher total reads as arithmetic gone wrong. Verified in a browser against a
live Custom Checkout session, reading the exact field the component renders: EE consumer
`Tax $11.76 / Due $60.76`, EU business with a VAT number `Tax $0.00 / Due $49.00`
(reverse charge), US `Tax $0.00 / Due $49.00`. Tax is zero until Checkout knows the
billing address — it cannot be computed without one — so the line comes alive as the
address element is filled.

*The founding charge collected no tax at all, on the path everyone takes.*
`captureFoundingLifetimeIfDue` and `applyLifetimeRetentionOffer` charged through a bare
`paymentIntents.create`, and **a PaymentIntent has no `automatic_tax`** — the parameter
does not exist on it. While the account held no registration this was invisible, since
everything computed to zero. With one, the same $49 product was taxed through Checkout
and untaxed here, decided only by `deferCharge = isTrailing || allowTrial` — and every
organization is created with both true, so essentially *every* founding purchase took
the untaxed path. Both now bill through an Invoice, which also gives the customer the
document that path never produced. Tested end to end: EE consumer pays $60.76 with an
invoice PDF, a retry on the same idempotency key produces no second invoice, an
unrelated pending invoice item is **not** swept in (`pending_invoice_items_behavior:
'exclude'`), and a VAT-registered business is zero-rated at $49.00.

That test caught a bug no type-check could: `invoices.create` without an explicit
`currency` inherits the **account** default, which is EUR here, and Stripe then rejects
a USD line item with *"You cannot combine currencies on a single invoice."* The old
PaymentIntent set currency per charge, so nothing had ever surfaced the mismatch.

*The webhook dedupe added below was wrong in three ways.*
- `claimStripeEvent` caught **every** error and returned "already processed", which the
  controller answered with 200. A momentary database problem therefore told Stripe the
  event was delivered and it was never retried — the precise failure the dedupe was
  written to prevent, now happening on the *first* delivery. Only `P2002` is caught now.
- Two handlers `return`ed a promise without `await`ing it, so their rejections landed
  outside the `try` and the claim was never released. Harmless before; with the dedupe
  it stranded the event permanently. The switch now sits in an awaited inner function.
- A claim that found an in-flight row answered 200, letting Stripe mark an event
  delivered while the first attempt could still fail. It now 409s, and the row carries
  `completedAt` so a claim can tell finished from in-progress and take over a crashed
  attempt once it goes stale. Seven behaviours verified against real Postgres, including
  that a non-`P2002` error propagates instead of masquerading as a duplicate.

*Revoking was keyed by customer, and excluded the wrong thing.* `hasEntitlingSubscription`
skipped the subscription that raised the event, which blinds it to that subscription's
**live** status — the one status worth reading. Stripe promises no ordering, so a
subscription that went `paused` then `active` can deliver `paused` last, and the
exclusion would revoke a customer who is active right now. The exclusion is gone; both
cases are answered by reading every subscription's current state. The terminal check
also moved above the metadata and card guards: it used to fire a $1 off-session
authorization against the card of the very customer being cut off, and a subscription
with unusable metadata could never be revoked at all.

*Two more revoke bugs.* `charge.dispute.created` also fires for retrieval requests and
fraud warnings, where no money has moved — those suspended a paying customer and told
them their bank had disputed a payment that was never disputed; `warning_*` statuses are
now ignored. And the full-refund test compared `amount_refunded` to `amount`, which is
wrong for a partially-captured charge; `charge.refunded` is Stripe's own flag. A refund
that does revoke now says so, instead of silently taking the plan away.

*100%-off codes granted nothing.* A fully discounted session completes as
`no_payment_required`, which the new `payment_status === 'paid'` guard silently dropped —
so a deliberate giveaway would have taken the customer to a success page and given them
nothing. It is grantable now and logged, because a promotion code only exists if someone
created it. Note Stripe scopes promotion codes to products, not to a session: a code
meant for subscriptions can still be typed into the founding checkout.

*Cancel-flow coupon bugs, found while auditing coupons end to end.*
`POST /billing/apply-discount` 500'd whenever `STRIPE_DISCOUNT_ID` named a coupon that
did not exist — and coupon ids are per-mode, so the id that works in test is absent in
live, making this a guaranteed break on the first real cancel. `checkDiscount` now
retrieves the coupon instead of merely checking the env var is non-empty. The endpoint
also discarded its own result, answering 200 with an empty body when it had applied
nothing; the dialog then told the customer *"50% discount applied successfully"* and
closed as `applied`, so they got neither the discount nor the cancellation. It returns
`{ ok }` now, like `apply-lifetime-retention` beside it. Both it and `check-discount`
gained the `!customer` guard `getActiveDiscount` always had — without it an org that
never reached checkout 500'd on the Billing screen. Separately,
`findAutoApplyPromotionCode` never expanded `promotion.coupon`, so the coupon-level
`autoapply` metadata and the `redeem_by` check were dead code. And the admin coupon
stamped `metadata.service: 'gitroom'` — the last such literal in the repo, breaking the
invariant documented on `SUBSCRIPTION_SERVICE_TAG` and hiding admin coupons from any
report filtered on it.

*The setup script certified the misconfiguration it exists to fix.* Its "already
registered" check compared only `country_options[cc].type`, so an EE registration on the
`standard` place-of-supply scheme — domestic sales only, the thing being corrected —
reported `SKIP — already active`. It compares the scheme now. Its webhook update also
sent `enabled_events` wholesale, silently unsubscribing anything else on that endpoint
while reporting it had "added" events; it unions instead.

*Still open, deliberately:* subscriptions created before the tax registration inherit
`automatic_tax` from their birth and will keep proration-invoicing untaxed, with no
repair path in code — those need fixing in Stripe one at a time. `getActiveDiscount`
reports only `percent_off`, so admin `amount_off` coupons never show on the Billing
banner. `prorate` and `getCouponInfo` now return tax-inclusive totals next to ex-VAT
prices from `pricing.ts`, so two different bases sit on the same screen. And
`charge.dispute.closed` is unhandled: winning a chargeback does not restore access.

**Stripe: made the account and the webhook actually safe to sell through.** Billing
correctness, no UI. `i18n`, `api`, `routes`, `gates` and `loops` are all unchanged —
no new endpoint, page, key or gate. One additive Prisma migration:
`20260809210000_stripe_event_dedupe`.

*Tax was calculating nothing.* `automatic_tax` has been on all along, but the account
held **zero tax registrations**, and Stripe will not charge tax where you are not
registered — so every invoice, everywhere, carried $0.00 tax. The seller's own VAT
number was also absent, which makes an EU B2B invoice invalid. Both are now set, and
the registration uses the `small_seller` place-of-supply scheme, not `standard`:
`standard` taxes only domestic sales, while under the EU's EUR 10 000/year threshold
the seller's own rate applies **across the EU**. Verified with the Tax Calculations
API on a $49 line: EE consumer 24%, DE consumer 24% (Estonian rate, the threshold
regime), DE business with a VAT number `reverse_charge` 0%, US `not_collecting` 0%.
**EU consumers now pay more than the listed price** — correct, and a visible change.

*Entitlement could outlive payment, three ways.*
- `updateSubscription` stopped re-granting on terminal statuses but never revoked, so
  with Stripe's dunning set to "mark unpaid" — which sends no
  `customer.subscription.deleted` — a customer kept a paid tier for free, permanently.
  It now revokes on `unpaid` / `paused` / `incomplete_expired`.
- `charge.dispute.created` and `charge.refunded` were not handled at all: a chargeback
  cost the payment, the bank's fee, and the plan stayed on.
- The lifetime grant fired on `checkout.session.completed` without checking
  `payment_status`. The session sets `allow_promotion_codes`, so a 100%-off code
  bought lifetime PRO for nothing.

Every one of those revokes is keyed by **customer**, which is the trap: a terminal
event for one subscription, or a refund of one old charge, would take the whole
account down. The concrete case is ordinary — a card fails at signup, the customer
retries on a working one, and ~23 hours later the abandoned attempt turns
`incomplete_expired`. `hasEntitlingSubscription` gates all three, so nothing is
revoked while Stripe still shows an active, trialing or past_due subscription. A
founding member has no Stripe subscription, so it correctly reports false for them.

*Webhooks were not idempotent.* Stripe redelivers on any non-2xx and may deliver twice
regardless; a redelivered `invoice.payment_succeeded` fired the purchase conversion
again (duplicated revenue in analytics and affiliate payouts) and a redelivered
`invoice.payment_failed` re-notified the customer. `StripeEvent` keys on Stripe's own
event id, so the insert **is** the check — proven under concurrency: of five
simultaneous claims exactly one wins. The row is released again if the handler throws,
so a genuine failure still gets Stripe's retry. The catch also logs now: it was
throwing `new HttpException(e, 500)`, which serialises an Error to `{}` and which Nest
does not log, so every webhook failure was a blank 500 with no record of the cause.

*Smaller, same pass.* The off-session founding charge keyed idempotency on the org
alone, so Stripe replayed a cached decline for 24 hours — a customer who fixed their
card got the old refusal back all day; the key now includes the payment method. Its
catch discarded the entire error, making a 3DS challenge indistinguishable from a dead
card; it now logs the code and returns the PaymentIntent client secret, which is the
only thing that can re-present an `authentication_required` charge on-session. The
`apiVersion` is pinned (to the version the account and SDK already agree on, so nothing
moves today) because this file reads shapes like
`invoice.parent.subscription_details.subscription` that an SDK bump can change without
a type error. `BillingSubscribeDto` no longer accepts the three retired tiers — a
hand-made POST could buy one at its legacy price and mint that product in Stripe. The
founding-member line item gained `tax_code` and `tax_behavior`; it was taxed as generic
services, not SaaS.

*One thing the code cannot enforce.* **Billing → Revenue recovery → Retries must be set
to "Cancel the subscription"** after the final attempt. The retry window IS the grace
period: `past_due` is deliberately entitled, and the app learns it is over from
`customer.subscription.deleted`. The revoke above is a second line of defence, not a
replacement. `scripts/stripe-setup.mjs` prints this, along with the customer-email and
public-details settings Stripe keeps out of the API.

*Checked and found fine, contrary to the audit that flagged it:* `allowTrial` is only
ever written `false` (on subscription create) and `true` at org creation — nothing
resets it, so trials are not repeatable. No change made.

*Still open, deliberately:* the deferred founding charge records a `processing`
PaymentIntent as settled to avoid double-charging, and `payment_intent.payment_failed`
is not handled, so an async failure after that would leave lifetime granted. Rare for
cards, and logged. Also unhandled: `trial_will_end`, `invoice.payment_action_required`,
and any periodic reconciliation — a dropped webhook is still permanent divergence.

**Optional company details in checkout.** Billing work, not a restyle, but it moved
`i18n.txt` by exactly one key: `billing_company_details`, the heading over a new
optional business name + tax ID row in the checkout form. Nothing was dropped and
`api` / `routes` / `gates` / `loops` are all unchanged — no new endpoint, no new
page, no new feature gate, no animation.

Why it was missing: checkout collected a card and a billing address and nothing
else. The name on a Stripe invoice was whatever the buyer typed into the
**Organization** field at signup, copied to `customers.create({ name })` once and
never refreshed. There was no legal entity name and no VAT number anywhere in the
product — `tax_id_collection`, `custom_fields` and `invoice_creation` appeared zero
times in the repo.

It is Stripe's own **Tax ID Element**, not a field of ours, so no new component, no
new token and no hex literal: the element inherits the `.Label` / `.Input` rules
already set on `CheckoutProvider`'s `appearance`. The design does not show this row,
which is fine here — Stripe draws it inside its own iframe, so there is no divergence
from the design system to reconcile. Both fields are optional
(`validation.*.required: 'never'`) and `visibility: 'auto'` hides the row entirely
where the billing country has no supported tax ID type.

Our `<h4>` sits outside Stripe's iframe, so when the element hides itself the
heading would be left over nothing. It follows the element's own `visible` flag
from `onChange` instead. The row is hidden **by class, never unmounted** —
unmounting would stop the change events, and the row could then never come back
when the customer picks a different country.

The subscription checkout runs `ui_mode: 'custom'`, meaning we draw the form. So
`tax_id_collection: { enabled: true }` on the session only *permits* collection;
`TaxIdElement` in `embedded.billing.tsx` is what makes it visible. The hosted paths
(`createCheckoutSession`, the lifetime `mode: 'payment'` session) draw it themselves
and needed the server flag alone. `customer_update` gained `name: 'auto'` on all
three — without it the entity name is collected and then dropped, and the invoice
keeps showing the signup org name.

Two consequences worth knowing before this ships:

- **Reverse charge.** `automatic_tax` is on. A business customer entering a valid
  EU/UK VAT is now zero-rated by Stripe Tax, so they pay *less*. Correct tax
  behaviour, real revenue effect.
- **`customer.name` is overwritten** with the typed entity name, so the customer
  name in the Stripe dashboard stops being the signup organization name.

Also fixed alongside: the founding-member `mode: 'payment'` session had no
`invoice_creation`, so it produced a charge and no invoice object at all. A founding
member who needed a company invoice had nothing to hand to their accountant. The
**deferred** (`mode: 'setup'`) founding path is still open — `captureFoundingLifetimeIfDue`
and `applyLifetimeRetentionOffer` create bare PaymentIntents and no invoice. Turning
those into invoices is a larger, riskier change and was deliberately left out.

Note for anyone testing: Stripe does not show this row to a customer that already
has a tax ID saved. An invisible field is expected there, not a bug. And Stripe's
invoice PDF is not a Turkish e-Arşiv/e-Fatura — this puts the entity name on the
invoice, it does not discharge that obligation.

**Autopost / Webhooks hardening pass.** Correctness work on the two features, not a
restyle — but it moved `i18n.txt`, so the reason belongs here.

`i18n.txt` gained **three** keys, all real new `t()` call sites: `n_shown` (the channel
picker's counter now says how many rows a search left, because "Select all" acts on
those and not on the full list), and `settings_update_failed` / `time_slots_required`
(the posting-times table checks the response instead of always toasting success, and
will not submit an empty slot list).

Five further keys were **already being called and existed in no locale at all**:
`no_channels_available_to_pick`, `no_pickable_channels`, `autopost_needs_channel`,
`webhook_needs_channel`, `something_went_wrong`. They are now written in all sixteen.
This is a blind spot worth knowing: `collect_i18n` scans `t()` call sites, not the
locale JSONs, so a key can sit in the baseline, pass the check, and still show English
to every non-English user. The check cannot see it; only a locale-side count can.

Note that the locale files are **not** in key parity with each other and never have
been (en 1067, tr 756, most 748, ka_ge 555) — en is the superset and the rest fall
back to it. That is a separate, pre-existing job.

Two Prisma migrations arrived with this pass: `20260808120000_autopost_auto_publish`
(per-rule choice between parking feed items in Drafts and publishing them) and
`20260808200000_post_release_id_index` (`Post.releaseId` had no index, and every
webhook delivery matches on it).

**Deploy order matters for this one.** `processCron` now starts `autoPostWorkflowV2`
with `TERMINATE_EXISTING`. Ship the orchestrator **before** the backend: the reverse
order terminates each rule's running v1 execution and replaces it with one whose type
the worker does not yet know, which then sits stuck.

**Loading-state pass.** Consolidated four "bone" greys onto one `--skeleton` token
behind `@gitroom/react/ui/skeleton`, and four spinner implementations onto
`@gitroom/react/ui/spinner`; reshaped page ghosts to mirror the markup they replace;
stopped a dozen surfaces from rendering their empty state — or, on Channels →
Automations, a live plug as "Off" — before their data arrived; and added the `loops`
check plus the CI step. Conventions are in `CLAUDE.md` under *Loading and empty
states*.

`loops.txt` is new, and empty. Two existing baselines shrank, both because the dead
`analytics/` subtree was deleted (`analytics.component`, `stars.and.forks`, `chart`,
`stars.table.component` — zero importers; the analytics route renders
`platform-analytics/` instead):

- `api.txt` lost `/analytics`, `/analytics/stars`, `/analytics/trending`.
- `i18n.txt` lost that subtree's eleven keys (`stars`, `forks`, `total_stars`,
  `stars_per_day`, `repository`, `processing_stars`, and so on). They are still
  present in the fifteen locale JSONs; only the call sites are gone.

`gates.txt` moved on five lines, and a gate count falling is exactly what that check
exists to question, so every reason is here:

- **`tier.public_api` 4 → 0.** The `/connections` route no longer gates on
  `public_api && isGeneral && org admin`. That condition was inherited from the page
  this one replaced, and two thirds of it were wrong in the new place: `public_api`
  is false on FREE — every unsubscribed account — and `isGeneral` is the hosted-SaaS
  flag, false on every self-host, which is the audience most likely to want MCP.
  Between them they hid the catalog from the people the product tour walks straight
  to it. **No capability was un-gated**: what is genuinely paid and admin-only is the
  credential, and the server still enforces that on its own — `/user/self` returns an
  empty `publicApi` to members and `POST /api-key/rotate` stays policy-guarded. What
  members gained is the catalog, the install steps, and a line saying where the key
  comes from. Rationale is repeated above `ConnectPage` in
  `public-api/connect-panel.tsx`.
- **`tier.webhooks` 4 → 5.** Additive: `webhooks/webhooks.tsx` reads the tier's
  webhook allowance a second time to enforce the limit before the create call rather
  than only when painting the quota line.

The last three moved with the deferred-items pass below, all in the same direction —
a pricing flag that nothing read becoming the thing that decides:

- **`tier.autoPost` 1 → 2, `tier.current` 18 → 16.** The one occurrence in the
  baseline was never a gate: it was the word `tier.autoPost` inside the comment above
  `settings.component.tsx`'s Auto Post row, which `collect_gates` counts because it
  reads comments on purpose. The two real call sites replace
  `tier.current !== 'FREE'` on the nav row and the tab body. That comment has been
  rewritten to stop naming the flag beside the code that uses it, which is the rule
  the collector asks for in its own header.
- **`tier.ai` 7 → 8.** One site, `useAiAvailable` in `layout/user.context.tsx`. Every
  `<CopilotKit>` mount and every Copilot consumer now reads that one answer instead of
  the bare `aiEnabled` env flag, so the provider and the components underneath it
  cannot disagree about whether Copilot is available.
- **`billingEnabled` 30 → 37.** Not seven new gates: it is the same rule written once,
  and the identifier appears seven times across `aiAvailable`'s signature and body,
  `useAiAvailable`, and the two provider call sites that pass it in.

## Deferred-items pass

The four items the launch-closing pass listed as *bilerek yapılmayacaklar*. Three are
here; **ESLint 8→9 is not** — it was landed separately because it moves `pnpm-lock.yaml`.

**The throttler answered 500 to anyone who asked.** `ThrottlerBehindProxyGuard` chose
routes with `url.includes(...)`, and Express `req.url` carries the query string, so
`POST /auth/login?x=/public/v1/posts` entered the throttler. That route has no
`AuthMiddleware`, `getTracker` read `.id` off an undefined `req.org`, and the answer was
a 500 — unauthenticated, repeatable, on any POST route. Matching moved to `req.path`
with `startsWith`, and the tracker falls back to the socket address when there is no
org. `permissions.guard.ts` had the identical `indexOf` bug and was fixed in the pass
above; this is the same fix in the other guard.

Second one on the same path: `ThrottlerStorageRedisService` calls `redis.call('eval')`,
and without `REDIS_URL` `ioRedis` is the `MockRedis` in `redis.service.ts`, which
implements `get`/`set`/`del` and nothing else. Every upload and every public-API post
threw on an install that had not set one. The storage is now only passed when there is
a real Redis; `@nestjs/throttler` falls back to its own per-process store, the same
trade `AbuseGuardService` already makes. **The set of throttled routes did not change**,
so nobody who works today starts seeing 429.

**Auto Post was gated by the webhook quota.** `POST /autopost` carried
`Sections.WEBHOOKS`, inherited from upstream, which counts webhook rows. It was wrong in
both directions: an org that had used its webhook allowance could not create an autopost
for an unrelated reason, and the `autoPost` pricing flag was read nowhere, so a tier
marked `false` had the feature anyway. There is now a real `Sections.AUTOPOST` on create
and update. Creator was given `autoPost: true` (owner, 2026-08-08) so the new gate takes
nothing from anyone paying today; retired STANDARD matches. `POST /:id/active` is
deliberately still open — switching a rule *off* must not require a subscription.

**`/copilot/chat` was the one AI route with no policy**, so a FREE org got a working
OpenAI runtime on our bill while `/copilot/agent`, `/copilot/list` and
`/copilot/:thread/list` all answered 402. Adding the policy alone was what the earlier
pass deferred, and rightly: CopilotKit speaks GraphQL through its own urql client, which
never reaches the `customFetch` wrapper that turns a 402 into the Payment Required
dialog, so the 402 surfaces as an unhandled `CombinedError`. The policy therefore lands
together with a tier condition on all three `<CopilotKit>` mounts and all six consumers,
through the single `useAiAvailable`. This also closes a live bug: `/copilot/agent`
always carried the policy, so on a billing-enabled install a FREE user opening `/agents`
already hit that error. `subscription.exception.ts` gained `AUTOPOST` and `AI` cases —
its `switch` has no `default`, so a section without one renders a blank dialog, which is
the bug the `ADMIN` case was added for.

## Known follow-ups

Real, unforced, and deliberately left out of the pass above:

- ~~**A downgrade to FREE leaves autopost rows saying `active: true`.**~~ Fixed in
  `2667a7e2`: `changeActiveCron` writes the column now (`integration.service.ts:72`).
  `AutopostService.stopAll` still has no caller.
- ~~**`POST /autopost/:id/active` carries no policy.**~~ Fixed: the tier check now
  sits in `AutopostService.changeActive`, on the `active: true` branch only, so
  switching a rule off still needs nothing. The old reasoning — that a lapsed org
  "cannot reach Settings" — did not hold: the route answers a session, and enabling
  a rule starts an hourly Temporal workflow.
- **`Sections.VIDEOS_PER_MONTH` has no branch in `permissions.service.ts`.** `check()`
  is deny-by-default, so any route that names that section is refused outright. No
  route names it today.
- **Cold load of the calendar is two waves, not one.** `/integrations/list` and the
  `/posts` wave now overlap; `/user/self` still gates everything
  (`new-layout/layout.component.tsx`, `if (!user) return <LayoutSkeleton />`).
- **Four empty-state vocabularies**: the shared `ui/empty-state.tsx` on legacy
  tokens, the `ui/no-channels-art.tsx` trio on the new ones, and locally-defined
  `EmptyState` components in `platform-analytics/render.analytics.tsx` and
  `agents/agent.chat.tsx`.
- ~~**`launches/helpers/use.sets.tsx`** has the non-ok hole~~ — already closed, in
  both fetchers (`use.sets.tsx:22`, `calendar.context.tsx:532`).
- ~~**`auth/testimonial.component.tsx`** has zero importers.~~ Deleted.
- ~~**`pqRing`** has zero consumers.~~ Keyframe and utility both removed.
- The `loops` collector has three documented blind spots — two looping utilities on
  one element, `className` expressions containing `>`, and brace nesting deeper than
  two levels. All latent; see the comment above `collect_loops`.

## Config-off paths told the truth pass

A launch-readiness audit of the running v3.3.0 install. The theme is one bug
written six times: **a feature that is switched off at the installation level
was reported to the user as a plan problem, a loading state, or a success.**

`gates.txt` moves two lines and `i18n.txt` gains three keys:

- **`billingEnabled` 36 → 39.** Three new reads, all guards being added rather
  than removed: `billing.component.tsx`, `first.billing.component.tsx` and the
  corrected condition in `new.post.tsx`.
- **`tier.ai` 8 → 7.** `createAiPost` no longer decides on `user.tier.ai`
  directly; it asks `useAiAvailable()`, which is the single rule. The padlock
  (`aiLocked`) still reads the tier, because a padlock *is* a tier statement.
- **i18n** gains `ai_not_configured_body` (the key already existed in five
  locales and had never been called) plus `billing_not_configured_title` and
  `billing_not_configured`, written into `en`. The other locales fall back, as
  they do for the 300-odd keys already in that position — including
  `billing_admin_only`, the sibling string on the same screen, which lives only
  as an inline fallback.

**"AI post" told everyone to upgrade.** `new.post.tsx` gated on
`!billingEnabled || !user?.tier?.ai`. On an install with no Stripe keys the
first clause is always true, so every user got "You need to upgrade" and a push
to `/billing` — a page the nav hides and whose checkout cannot take money. The
same file had the correct form two hundred lines below in `aiLocked`. Now: no
OpenAI key gets a plain toast and no billing trip, and the upgrade dialog is
reserved for the one case where upgrading is genuinely the answer.

**Video generation demanded the end of a trial that did not exist.**
`media.service.ts` checked `!video.trial && org.isTrailing` with no
`isBillingEnabled()`. Every new organization is written `isTrailing: true` for
seven days regardless of billing, so the first week of every account on a
billing-off install was told to finish its trial and charge a card. The
correctly-guarded twin was already in `integration.service.ts`.

**Every non-US user hydrated a mismatch.** `date.format.tsx` refreshed its
snapshot at module load, which runs before React replays the server markup. The
server renders MDY + 12-hour (it cannot know the visitor's locale) and the
browser immediately answered DMY + 24-hour, so React discarded the server HTML
and repainted — a visible flash of wrong dates and times on anything with a
timestamp. The `useSyncExternalStore` plumbing was already correct; the pattern
builders were bypassing it. They read the snapshot now, and the module-load
refresh is gone. Safe because all seven files that call them also subscribe via
`useDateFormat()`.

**A failed `/sets` fetch read as "no sets".** Neither fetcher checked
`response.ok`, and `customFetch` resolves 4xx/5xx — so a server error parsed as
data, `setsError` never populated, and `resolveSets` (which was written
correctly) took the happy path. The composer skipped its Select-a-Set step
silently for people who have sets. Both fetchers were fixed together because
they share the `'sets'` SWR key and which one runs depends on mount order.

**`/billing` was a storefront that could not take money.** No `billingEnabled`
check on the page or on `POST /billing/subscribe`; the route is navigable even
though the nav hides it, and pressing Purchase reached Stripe with the
`sk_nothing` placeholder and returned 500. Both ends now say so plainly.

**A downgrade left autopost rules reading "On".** `changeActiveCron` terminated
the workflow and never wrote the row, so Settings drew a rule as active with
nothing behind it, and a later re-upgrade restarted nothing. It writes the row
now, and a Temporal failure is logged rather than swallowed by an empty `catch`.

**Three sections could still render a blank Payment Required dialog.**
`getErrorMessage` has a `default` arm at last. This bug has been found three
times — `ADMIN`, then `AI` and `AUTOPOST` — each fixed by adding one more case,
which left the next one waiting. `COMMUNITY_FEATURES`, `FEATURED` and
`IMPORT_FROM_CHANNELS` were the uncovered ones.

Two self-host traps closed while in the area. `hasProvider()` now also requires
`EMAIL_FROM_ADDRESS`/`EMAIL_FROM_NAME`, without which `sendEmail` returns early
while every caller believes mail works — with `REQUIRE_EMAIL_ACTIVATION=true`
that is a permanent lockout with no error anywhere. And `UploadFactory` refuses
`STORAGE_PROVIDER="local"` with no `UPLOAD_DIRECTORY` instead of writing to a
literal `./undefined/` directory that reads back as a 500; the frontend now
defaults to `local` the same way the backend always did.

`version.txt` is deleted. It said `v3.0.2`, nothing read it, and it sat beside
the `package.json` version that `d5550b7e` had just corrected to 3.3.0.

### Looked at and deliberately left alone

`autopost.service.ts`'s start-failure path also leaves a row `active: true`, and
the comment there argues — reasonably — that switching a rule off behind the
user's back on a transient Temporal blip is worse. That reasoning stands. The
real gap is that `processCron`'s return value is discarded by both callers, so
the API answers "saved" either way; surfacing it needs a response-shape change
and a frontend to match, which is its own change rather than a line in this one.

## Payment path pass

Billing went live with real Stripe keys, so the subscription lifecycle was
audited from the position of the first real paying customer. What follows is
what that found. `i18n.txt` gains two keys for the new "still processing" state.

**`checkValidCard` cancelled the subscription the customer had just paid for.**
It ran a $1 off-session, manual-capture authorization against the card, and on
anything other than `requires_capture` — or on any thrown error — it detached
the card and called `subscriptions.cancel` on that subscription. Every new
organization carries `allowTrial: true` until this very webhook clears it, so
that branch sat on the path of the *first* subscription of every account.

Three ways it fired on a good card: `off_session: true` throws
`authentication_required` for any card wanting 3DS, which in an EU account is
most of them; `currency: 'usd'` is hardcoded; and the detach used
`paymentMethods.data[0].id` while the probe used `latestMethod.id`, so it could
unlink a different card than the one that failed. Checkout has already validated
and 3DS-verified the card before this event exists, so the probe is now
advisory: logged, never acted on, and the $1 hold is released either way.

**Failing to grant answered Stripe 2xx, so it never tried again.** Two paths did
this — `{ ok: false }` out of `createSubscription`/`updateSubscription`, and two
`return {}` swallows in `createOrUpdateSubscription` that hid both "no
organization matches this Stripe customer" and *any* thrown error. Stripe treats
2xx as delivered. The result was a customer charged, no `Subscription` row, no
retry, and nothing in the logs. Now the only 2xx-without-a-row is `incomplete`
(Stripe has not taken the money and will send another event) and an unknown
tier; everything else throws so the webhook 500s and Stripe retries for three
days.

**The customer was trapped behind an un-dismissable loader.** `check.payment.tsx`
polled `/billing/check` once a second forever while the page sat blurred and
`pointer-events-none`. `/billing/check` answers `0` for "still processing" and
for "no row was written and never will be" alike, so either failure above pinned
the customer there with no exit but editing the URL. There is a 60-attempt cap
now, a failed poll counts as an attempt instead of breaking the recursion with
an unhandled rejection, and the timeout hands the screen back with an honest
message. Same shape as the cap `finish.trial.tsx` already had.

**`customer.subscription.updated` wrote the paid tier for almost any status.**
The gate was `status !== 'incomplete'`, which let `canceled`, `unpaid`,
`incomplete_expired` and `paused` through with `deletedAt: null`. If the Stripe
dunning setting is "mark unpaid" rather than "cancel", no `deleted` event is ever
sent and the customer keeps the tier forever; and since Stripe does not promise
event ordering, a `deleted` processed before a trailing `updated` had its row
deleted and then recreated. Only `active`, `trialing` and `past_due` grant now.

**`products.list` returned ten rows and the catalog is built to overflow that.**
Three call sites, none passing `limit`, none paginating — while the lifetime
checkout mints a brand-new Product on *every* purchase through inline
`product_data`. A handful of founding-member sales pushes the four tier products
off page one, the name lookup misses, and each subscribe creates a duplicate
tier product and price. No overcharge, but the catalog and every report built on
it stop meaning anything. `limit: 100` on all three, matching the other list
calls in the file.

**A plan change lost its identifier and claimed success anyway.** The update
wrote `id` and `ud` into metadata but not `uniqueId`, which is the key both
webhook handlers read — so the row kept its old identifier and
`/billing/check/<new id>` could never resolve. Meanwhile the frontend wrote the
new tier into the SWR cache with `revalidate: false`, so nothing ever corrected
it, while `proration_behavior: 'always_invoice'` had already charged the
customer. Metadata carries `uniqueId` now and the optimistic write revalidates.

**A malformed event could 500 in a loop for three days.** `pricing[billing]` was
dereferenced unguarded on metadata that a Dashboard-created subscription may not
carry. Worse, the controller's `try/catch` could not catch it: `stripe()` was not
`async` and the handlers were returned unawaited, so the rejection escaped Nest
entirely. The handler is `async`, the returns are awaited, and an unknown tier is
acknowledged and dropped rather than retried — a retry cannot conjure missing
metadata.

Finally, an unsigned request to `/stripe` returned 500 with a full stack trace,
so every scanner hitting that URL looked like a crash and a real signing-key
mismatch was indistinguishable from the noise. It is a 400 now.
`STRIPE_SIGNING_KEY_CONNECT` is removed from `.env.example` — it was documented
and read nowhere — and the remaining three keys gained notes about mode
selection, since the key prefix is what picks test versus live.

### Found and deliberately left

- **Cancellation disables everything and nothing re-enables it.**
  `pricing.FREE.channel` is 0, so a `customer.subscription.deleted` disables
  every channel and terminates every autopost workflow. Nothing is deleted, but
  there is no inverse: a returning customer re-enables each channel by hand, and
  scheduled posts sit in `QUEUE` with a past date and never fire.
- **`invoice.payment_failed` is classified as a success notification**, so a
  customer who turned off success emails hears nothing about a failed renewal —
  and it re-sends on every dunning attempt.
- **`getUserById(undefined)` returns the first user in the table**, and invoice
  events are exempt from the service-tag filter, so another integration's
  invoice on the same Stripe account could attribute a purchase to the wrong
  person. Harmless at one user.

### One claim checked and rejected

The audit flagged `expand: ['data.prices']` as an invalid expansion that would
400 every subscribe against live keys. Tested against the live account before
acting on it: **HTTP 200**. Checkout was never broken by it.

## Pre-launch sweep

Two areas that had never been audited in this run: the publish path — the one
thing the product exists to do — and tenant isolation. Both were worth opening.
`i18n.txt` gains one key.

### A session cookie could mint a free unlimited organization

`POST /enterprise/create-user` is unauthenticated by design, and its only check
was `AuthService.verifyJWT` — which verifies nothing but "signed with
`JWT_SECRET`". The session cookie is exactly that: the whole User row signed
with that key, with no expiry, audience or purpose claim. It carries `id`,
`name` and `email`; the endpoint destructures `{id, name, saasName, email}` and
answers with an organization on a **lifetime AGENCY subscription with a million
channels, API key included**.

So anyone who could register a free account could post their own cookie back at
this endpoint and receive an unlimited paid one. Nothing in the repository calls
these routes and production had never received a request for one — the four log
lines mentioning `/enterprise` are Nest registering the paths at boot.

All four reseller routes (`/enterprise/*` plus `/public/modify-subscription`,
which disables an organization's channels, locks out its members and kills its
autopost workflows) now verify against `ENTERPRISE_SECRET`, a key distinct from
`JWT_SECRET`. A session token is not merely rejected there, it is structurally
unusable. Unset — every install that does not run a reseller integration — the
routes refuse outright.

Three more from the same root cause, that "signed" was being read as
"authorized":

- **`forgotReturn` accepted any signed token with an `id`.** It checked
  `dayjs(user.expires).isBefore(now)` without checking that `expires` was
  *present*, and `dayjs(undefined)` is now, so `now.isBefore(now)` is false and a
  token with no expiry sailed through. Combined with a session cookie that has
  an `id` and never expires, any place one leaked was a permanent
  account-takeover primitive. `getOrgFromCookie` had the identical hole on
  `timeLimit`.
- **`inviteTeamMember` spread the request body into a signed JWT.** The global
  `ValidationPipe` runs with `transform: true` and no `whitelist`, so undeclared
  keys survive into the DTO, and the endpoint returns the signed URL even when
  `sendEmail` is false — a way for an org admin to obtain a `JWT_SECRET`-signed
  token with claims of their choosing. It now names the three fields the invite
  consumer actually reads.
- **`POST /oauth/authorize` carried no policy.** `public.auth.middleware.ts`
  resolves a `pos_` token and synthesises `role: 'SUPERADMIN'` for it, so a
  plain member could approve a third-party app and walk out with full
  organization rights across the public API and MCP — routing around the gate
  that already withholds the raw API key from non-admins. Admin-only now.

### The public share page returned drafts and provider settings

`GET /public/posts/:id` spread every scalar column on Post, including `settings`
(the per-provider JSON: subreddit, board, "post as" identity), `error`,
`releaseId` and `organizationId` — and did not filter by state, so unpublished
drafts were as public as published posts. The integration object beside it had
been picked field by field for exactly this reason; the post had not. It is an
allowlist now, filtered to `PUBLISHED`. There is no share toggle in the product,
so a customer cannot turn this off and is not told it exists; post ids are cuid
v1, which is not the unguessable token that design leans on.

### The publish path could post the same thing up to fifteen times

`post.workflow.v1.0.5.ts` retried on failure by falling out of its catch and
letting the loop run `postSocial` again — five passes, each activity already
retrying three times. There is no idempotency anywhere on that path: nothing
reads `releaseId` before calling the provider and no idempotency key is passed.
The errors that took that branch were provider 5xx, connection resets and read
timeouts — precisely the cases where the post most likely *did* land. `updatePost`
sat inside the same try, so a database blip while marking a successful post
PUBLISHED also took it: the row went to ERROR and the post went out again.

Workflows on `main` cannot be edited — running executions replay against the
code they started with — so this is **`post.workflow.v1.0.6.ts`**, with v1.0.5
still exported for anything mid-flight, and `posts.service.ts` starting the new
one. Same shape as the `autoPostWorkflowV2` migration.

Two more duplicate-publish paths closed in the activity, which is editable:
`streakWorkflow.start` ran *after* the post was live with no guard, so any
Temporal hiccup there failed the activity and Temporal retried it — publishing
again. It is wrapped now, with a note that nothing past the provider call may
fail the activity.

### A failed schedule was unreportable by construction

`startWorkflow` ended in `catch (err) {}`. `createPost` attaches a `.catch` that
reports to Sentry and logs — and that handler could never run, because the
promise could never reject. An unreachable Temporal therefore looked exactly
like a successful schedule: HTTP 200, a row in QUEUE, and nothing anywhere
saying the post would never publish. It rethrows now, and the two reschedule
callers report instead of swallowing.

### `changeDate` would republish a published post

`changePostStatus` refuses to touch a PUBLISHED or ERROR post. `changeDate`,
directly below it, cleared `releaseId`/`releaseURL`, put the row back in QUEUE
and started the workflow — with no state check at all. The only thing in the way
was a confirmation modal in the calendar, so a stale tab, a double drop or any
direct API call published the same content to the audience a second time; if the
new date was in the past the workflow slept zero and posted immediately.

### Scheduled times were correct only because of one line in main.ts

The frontend sends a naive wall-clock string in UTC and `posts.repository.ts`
parsed it with bare `dayjs`, which is local-time parsing. It came out right only
because `apps/backend/src/main.ts` pins `process.env.TZ = 'UTC'` — one line, in
one of the two services that write posts. The orchestrator does not set it,
which is why `autopost.service.ts` has to append a literal `'Z'`. Both parse
sites use `dayjs.utc` now, so the result no longer depends on the host clock.

### Found, verified, and left for a follow-up

- **A cancelled or unsubscribed org loses its queued posts.** With billing on,
  `getPostsList` returns `[]` for an org with no subscription, the workflow marks
  the post `ERROR` with reason `No Post`, and that reason is on the
  notification-suppression list — so the content is destroyed silently and the
  hourly sweep will not retry it, because it only looks at `QUEUE`.
- **`missingPostWorkflow` has no try/catch and no `continueAsNew`.** One failed
  activity ends the only safety net in the product until someone restarts the
  backend, and history growth terminates it after roughly eight months. Nothing
  alerts either way.
- **Search attributes are not registered when `TEMPORAL_TLS=true`**
  (`temporal.register.ts:9-12`), and every start and every terminate-sweep uses
  them. On a TLS install nothing schedules and nothing cancels, silently.
- **The sweep's two-day window**, its blindness to channels that were
  disabled/refreshNeeded during it, and the dead `poke` signal handler.
- Partial threads mark the root ERROR while it is live; multi-channel creation is
  not atomic; `updateMedia` labels every item `type: 'image'`, including videos.
- Isolation medium-severity: OAuth app `pictureId` is an unchecked cross-org
  foreign key; the R2 multipart handlers trust a client-supplied key; local
  storage filenames come from `Math.random()`; `third-party` dispatches on an
  unvalidated method name.

The repository sweep for missing org scoping came back **clean** on everything
reachable over HTTP. What is unscoped is worker-only and reached through
already-scoped callers.

## Before the next release

Everything above this line is merged to `main` but **not released** — production is on
`v3.2.0`, which predates all of it. These are the things that have to be handled by
whoever cuts the next version. None of them is a code change; they are all rollout
order and environment.

**1. `Post_releaseId_idx` takes a write lock on the busiest table.**
`migrations/20260808200000_post_release_id_index/migration.sql` runs a plain
`CREATE INDEX` on `Post`. The comment in the file explains correctly why
`CONCURRENTLY` was not used — Prisma wraps a migration in a transaction and
`CONCURRENTLY` cannot run inside one — but that does not make the lock cheap: every
INSERT/UPDATE/DELETE on `Post` blocks for the length of the build. Run it by hand in a
quiet window first:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Post_releaseId_idx" ON "Post"("releaseId");
```

Then the deploy-time creation is a no-op. This applies on **both** schema paths — on the
default `db push` path Prisma emits the same non-concurrent statement from
`schema.prisma:449`.

**2. Confirm which schema path production actually uses.** `prisma-apply` runs
`db push --accept-data-loss` unless `PRISMA_MIGRATE` is truthy, in which case it runs
`migrate deploy`. If the answer is `migrate deploy`, check first:

```sql
SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;
```

There is no `migration_lock.toml` under `migrations/`, and until this pass `0_init` was
the only migration in the tree — both of which point at a database that was built with
`db push`. If `_prisma_migrations` does not contain `0_init`, `migrate deploy` will try
to replay 1,344 lines of `CREATE TABLE` against a populated database and fail on the
first `already exists`. `prisma migrate resolve --applied 0_init` is the fix, and it is
not something to discover mid-deploy.

**3. Deploy order — orchestrator first, then backend and frontend together.**

- *Orchestrator before backend.* `autopost.service.ts` now starts `autoPostWorkflowV2`
  with `TERMINATE_EXISTING`. If the backend goes first, the next time anyone saves or
  toggles a rule, that rule's running v1 execution is terminated and replaced with a
  workflow type the old worker has never heard of; the workflow task then fails and
  retries forever. It recovers on its own once the orchestrator ships, and only rules a
  user actually touches are affected — but the terminated v1 history does not come back.
  `autoPostWorkflow` (v1) is still exported from `workflows/index.ts` purely so existing
  executions can replay; do not remove it.
- *Backend and frontend together, in both directions.* Backend-first gives every FREE
  org an unhandled CopilotKit error, because `/copilot/chat` starts answering 402 and
  CopilotKit's urql client never reaches the wrapper that turns a 402 into the Payment
  Required dialog. Frontend-first is fine for Copilot but breaks the posting-times
  table, whose empty-list rejection (`@ArrayNotEmpty`) needs the new frontend to avoid
  reporting a false success. Simultaneous is the only clean answer.
- If production runs the single `Dockerfile.dev` image, `pnpm run --parallel pm2` starts
  backend and orchestrator from one artifact and the ordering question does not arise.
  It only matters if they are separate deployables.

**4. Environment, checked before the deploy rather than after.**

- **`REDIS_URL`** must be set. The throttler now only uses Redis storage when it is,
  and falls back to a per-process counter otherwise — with N backend instances the
  effective limit becomes N × `API_LIMIT`.
- **`SUPPORT_EMAIL`** defaults to `support@postqueen.ai`. Help → Contact support and
  Help → Report a bug always render, so if this is unset your users' bug reports come
  to us.
- **`TRANSLOADIT_TEMPLATE`** is read by all three frontend layouts and appears nowhere
  in `.env.example`. If Transloadit uploads are meant to work, it has to be set, and
  the example file should gain it.
- The video providers evaluate their keys **at import time** (`veo3.ts`,
  `images.slides.ts`), so adding `KIEAI_API_KEY` or the Image-Text-Slides set needs a
  backend restart, not a config reload. Image Text Slides is all-or-nothing across
  `ELEVENSLABS_API_KEY` + `TRANSLOADIT_AUTH` + `TRANSLOADIT_SECRET` + `OPENAI_API_KEY` +
  `FAL_KEY`.

**5. Tell webhook customers their payload changed.** `getPostByForWebhookId` now matches
on organization + integration + `releaseId`, so deliveries that used to arrive with an
empty array now carry real post data. Receivers written against the empty array may
choke on it.

**6. ~~CI still does not run.~~** Resolved 2026-08-08 — the owner pressed the button on
the Actions tab and `push` / `pull_request` runs fire normally now. Worth keeping the
history: everything merged before that date went in unguarded, so a clean commit log
from before it is not evidence anything was checked.

## Backlog-clearing pass

The follow-ups recorded above, worked through rather than carried into launch. Two
releases: v3.3.2 (customer-facing) and v3.3.3 (isolation and cleanup).

Every item was re-checked against the code before being worked on, and **three of the
recorded ones had already been fixed** — `changeActiveCron` writes the autopost column
(`2667a7e2`), the `use.sets` non-ok hole is closed in both fetchers, and the
`Post_releaseId_idx` lock concern is moot (the index exists in production and `Post`
holds no rows). Those entries are struck through above. A follow-up list that is not
re-verified sends the next pass chasing work that is already done.

**A lapsed subscription destroyed queued posts in silence.** `getPost` answers falsy for
an org with no subscription exactly as it does for a deleted post, the frozen workflow
turns either into `ERROR / 'No Post'`, and that string is on the silence list in
`changeState`. The hourly sweep could not recover it either — it collects `QUEUE` only.
`changeState` now asks the subscription on that path and writes `'Subscription
required'`, which notifies. The post stays ERROR on purpose rather than returning to
QUEUE: a post scheduled three weeks ago should not fire the moment someone resubscribes.

**Channels came back on an upgrade.** `disableIntegrations` had no counterpart, so a
returning customer found their channels dark. Needed `Integration.autoDisabledAt` to
tell "the system took this away" from "I turned this off deliberately"; nulls on
existing rows read as the user's own choice, which can only withhold an automatic
re-enable and never cause one. Both directions run through one `syncChannelsToPlan`,
which also covers the redeemed-code path that skips `modifySubscription` entirely.
Autopost rules are deliberately **not** resumed: enabling a channel publishes nothing,
an autopost rule does.

**The recovery sweep died on the first failure it met.** `missingPostWorkflow` had no
try/catch and no `continueAsNew`. `missing.post.workflow.v2.ts` follows
`autoPostWorkflowV2`'s shape. The workflow id changes with it, because v1 never closes
on its own — **the v1 singleton has to be terminated by hand after deploying**.

`TEMPORAL_TLS=true` skipped registering the two custom search attributes, and both the
start path and the terminate sweep address workflows through them, so a TLS install
would silently schedule nothing. The early return is now a try/catch: an install that
cannot register them logs and continues, one that can does.

**Four places trusted the caller about ownership**: `third-party`'s `functionName`
dispatch (now an allowlist resolved from the provider's own prototype), OAuth app
`pictureId` (now `findOwnedMediaIds`, as post media already does), the five R2
multipart endpoints (upload key bound to the org in Redis for a day), and local storage
filenames off `Math.random` (now `makeId`). None was exploitable; all three of the first
group matter from the second organization onwards.

**`POST /autopost/:id/active`** now carries a tier check on the `active: true` branch
only. The old note said a lapsed org "cannot reach Settings", but the route answers a
session, and enabling a rule starts an hourly Temporal workflow.

**`updateMedia` labelled every attachment `type: 'image'`**, videos included, and that
value is what the publish payload carries: `gmb.provider` sends `mediaFormat: PHOTO` for
anything not `'video'`, `telegram.provider` picks sendPhoto over sendVideo. Derived from
the path now, because the `Media.type` column has never been written to and every row
carries the default.

Deliberately left: the four empty-state vocabularies (pure refactor, no user-visible
effect, and the baselines are contended across parallel sessions), the calendar's
two-wave cold load (wants measurement first), and the `loops` collector's three
documented blind spots.

## i18n baseline after the agent-logo pass

`i18n.txt` lost 22 keys — the `conn_*` strings for Warp, Windsurf and Cline. The
branding pass (#50) deleted 165 lines of `connections.catalog.ts` along with
those entries, so the `t()` call sites went with them; the baseline just was not
updated in the same PR and left `main` red.

Verified before updating rather than assuming: none of the removed keys has a
call site left anywhere in `apps/frontend/src`. The drop is the intended
consequence of deleting the catalog entries, which is exactly the case the check
asks you to `--update` for.

## Dependency vulnerabilities

Nothing had ever scanned this project's dependencies. `pnpm audit` does not run
here — it exhausts memory and is killed even with an 8 GB heap in a 10 GB
container, so the failure was never a Node version problem, the graph is simply
too large for it. Dependabot was off. The state was unknown, not clean.

`osv-scanner` reads the lockfile directly and answers in seconds: **264 findings
across 75 packages**, 17 of them direct. One was verified before acting on the
number — GHSA-35jp-ww65-95wh, full MitM via prototype pollution in axios,
affecting 1.0.0 to 1.16.0, and we were on 1.14.0.

**The lockfile refresh was reverted.** It closed 170 findings and broke the
backend: `@mastra/core` moved 1.21 to 1.57 inside its own caret range, and with
`zod-to-json-schema` at 3.25.2 the schema adapter calls a default export that is
no longer there. The backend crashed at boot, in production, and was rolled back
inside three minutes. Nobody was affected — there are no users yet — but the
mistake was mine and it was avoidable: all three apps were built and
typechecked, and none of them was *run*. A dependency change has to be booted,
not compiled.

What that attempt would have closed, for the record: **170**, moving no specifier in `package.json`
— `pnpm update` wanted to rewrite 304 lines of them, which was reverted, because
staying in step with upstream is what keeps cherry-picking cheap and the
lockfile is the pin that matters.

Three things broke, found by building rather than typechecking: the Neynar SDK
tightened an embed type the Farcaster API does not actually require that way,
and polotno 3.7 ships a re-export TypeScript cannot resolve through — pinned
back to 3.0, since it carries no advisory and the bump was pure churn.

**The scan is in CI now** (`dependency-scan.yml`), which is the part that lasts.
It gates on findings that are *new* against `.github/osv-known.txt`: the 96 that
remain each need a semver range moved and reviewed on its own, and several have
no released fix at all. A check that failed on those would be permanently red,
which is the same as no check. The script also reports accepted entries that
have stopped appearing, so the list shrinks rather than becoming a place to
sweep things.

## Upstream sync

`gitroomhq/postiz-app`'s 42 post-fork commits, brought in over seven PRs (#38–#44).
**41 taken, 1 skipped.** The per-batch reasoning is in the PRs and the process is
written down in [`upstream-sync.md`](upstream-sync.md) so the next one is cheaper.
Three things belong here.

**`i18n.txt` gained four keys** — `post_already_published_republish_warning`,
`republish_at`, `republish_recurring_note`, `republish_the_post`. They are real
new `t()` call sites in the calendar's drag handler: the confirmation now names
the channel and the original publish date, and says so when the post recurs.
Baseline updated deliberately.

**`api.txt` gained three endpoints and `i18n.txt` thirty-nine keys**, all
additions, none removed. The endpoints are the admin coupon tools
(`/billing/coupon-info`, `/billing/apply-coupon`, `/billing/cancel-coupon`),
superadmin-gated as upstream wrote them. The keys are that modal plus X's
article format. Both baselines updated deliberately.

**Batch by date, not by theme.** The first attempt cut batches thematically and
collided three times, because these 42 commits form a dependency chain — the
pending-post contract is commit 12 and later commits patch the methods it
introduces, so a themed batch kept pulling commits past their own foundations.
Chronological order fixed it: the run after the switch landed ten of eleven
commits with no conflict at all.

**September 2026, second batch: `api.txt` gained two endpoints and `i18n.txt`
twenty keys**, all additions. The endpoints are `/auth/oauth/APPLE` (Sign in
with Apple, whose button only renders when `APPLE_CLIENT_ID` is set) and
`/user/delete-account`. The keys are the delete-account card and its scrim,
TikTok Business's music and location pickers, and the Apple button. Both
baselines updated deliberately. The `loops` check earned its keep here:
upstream's delete-account scrim spun a hand-rolled ring with no `pq-loop`, so
it would have kept spinning for readers who asked for less motion. It uses the
shared `Spinner` now, and that baseline stayed empty.

**September 2026, third batch: `i18n.txt` gained two keys and `gates.txt` one
`tier.current` call site.** The keys are the FAQ's new "How can I delete my
account?" entry, and the gate is the condition that shows it: FREE-tier users
only, as upstream wrote it. Both baselines updated deliberately.

**September 2026, fifth batch: `i18n.txt` gained two keys**,
`subscription_managed_by` and `subscription_manage_on_platform`. They are
the Billing page's state for an organization whose subscription was bought
through the mobile app's store (RevenueCat): nothing on the page can change
it, so the page says where to manage it instead. Baseline updated
deliberately.

## Self-audit of the backlog-clearing pass

The pass above was re-read against the code afterwards, on the principle that the
round which fixes ten things is the round most likely to break an eleventh. Three
things came out of it, one of them a loss the fix itself would have caused.

**The redeemed-code path could take channels away.** `syncChannelsToPlan` was
wired into `createOrUpdateSubscription`'s code branch to *restore* channels after
a lapse, but it is two-way. `grantLifetimeFromPayment` always grants PRO (thirty
channels) and a trialing organization reads as AGENCY (a million), so a customer
converting to a founding purchase with more than thirty live channels would have
had the excess switched off — at the moment they paid, on a path where nothing
happened before. The give-back half is now `restoreChannelsUpTo`, and that branch
calls only it.

**A refused multipart upload was post-processed anyway.** `media.controller`
reads `.Location` off whatever `handleR2Upload` returns for
`complete-multipart-upload`, and several branches inside answer the request
themselves and return the Response — an unsupported extension, a body that does
not match its type, and now a key the organization never created. That threw a
TypeError on top of an already-sent 400 or 403. The two 400s predate this work;
the 403 made it easier to reach. Guarded with `res.headersSent`.

**Reconnecting a channel left the `autoDisabledAt` stamp on it**, so a live row
could claim the system had switched it off. Harmless today because the enable
query requires `disabled: true`, but it is exactly the kind of half-true
invariant that misleads the next reader.

What was checked and found correct is worth recording too, so the next pass does
not re-derive it: the third-party allowlist resolves the real provider's methods
(tested against the compiled `ReelFarmProvider` — `listMedia` in, `constructor`
out); the request organization does carry `subscription`, and subscription
deletion is a hard delete, so the autopost tier check reads FREE after a
cancellation as intended; the orchestrator only calls `startAutopost`, so the
`changeActive` signature change reaches nobody else; pm2 runs one process per app
in fork mode, so the Redis upload-ownership map works even on an install without
Redis; and `autoDisabledAt` never leaves the backend, because `/integrations/list`
builds an explicit shape.

One trade made knowingly: wrapping `TemporalRegister` in try/catch means a
non-TLS install that cannot register its search attributes now logs instead of
failing to boot. Quieter, but taking the whole application down was not the right
answer to it.

## Self-hosting

Self-hosters cloning a fresh empty database do not need any tier-migration
step — new installs only use CREATOR / GROWTH / PRO / AGENCY.

**Gates `billingEnabled` 39 → 42 (AI video modal).** With billing off,
`checkCredits` now answers "unlimited" instead of 0 (it counted a self-hosted
organization, which has no Subscription row, as FREE, so every video
generation was refused with a 402). The video modal in `ai.video.tsx` follows
the image generator's existing rule: with billing off it does not fetch the
allowance and does not render "N credits left". The three new call sites are
that read, the skipped fetch and the hidden counter. The modal also gets its
own SWR key (`copilot-credits-ai_videos`); it shared `copilot-credits` with the
image generator, which caches its `ai_images` allowance there.

**Gates `billingEnabled` 42 → 55, `tier.webhooks` 5 → 3 (no trial, founding or
quota UI with billing off).** The backend already answers billing-off requests
with the top tier, no lifetime flag and no trial; these are the matching guards
on the screens that read them, so a stale value can never bring them back:
the founding chip (`layout.component.tsx`) and the founding rail row
(`rail.tsx`), `/billing/lifetime` (`lifetime.deal.tsx`, now the same
"Billing is not set up" screen as `/billing`, moved to
`billing.not.configured.tsx`), the webhook quota in the pane header and the
"at its webhook limit" line (`webhooks.tsx`, both now read `webhookLimit`,
which is why two `tier.webhooks` reads went), the `?precondition` trial-charge
modal (`pre-condition.component.tsx`), and the global 406 "finish the trial"
and 402 "move to billing" dialogs (`layout.context.tsx`, which answer the way a
dismissed dialog does). No new i18n keys.

**i18n +6 (connection panels point self-hosted tools at their own API).** The
CLI, the skill, the SDK and the n8n node all default to the hosted API
(`POSTQUEEN_API_URL` / the n8n credential's Host), and the panels only said to
export the key, so a self-hoster following them sent it to the hosted service.
When the instance is not on postqueen.ai (`needsApiUrl`), the skill and CLI
callouts and the skill, CLI, SDK and n8n catalog steps now add the address:
`conn_step_api_url(_detail)`, `conn_sdk_step_url(_detail)`,
`conn_n8n_step_host(_detail)`. On the hosted service nothing new renders. The
MCP and REST URLs are also made absolute (`absoluteApiUrl`), since behind the
relative `/api` dev proxy they came out as paths nothing else could use.

**Gates `billingEnabled` 55 → 60, i18n +3 (design editor and image generation
follow the configured keys).** Design Media and the Editor button opened
Polotno whatever `NEXT_PUBLIC_POLOTNO` said, and Generate image rendered with
no `OPENAI_API_KEY`, so both were on screen and broken wherever the key was
missing (the hosted service included). With billing on they now render only
when the key is there. With billing off (self-hosted) they stay, and without
the key a click opens `FeatureSetupHint` instead: admins get the variable to
set and a docs link, members are told to ask an admin
(`feature_setup_admin`, `feature_setup_docs`, `feature_setup_member`). The five
new call sites are the two `useVariables()` reads in `media.component.tsx`,
the two `showDesign` rules and `showAiImage`. AI video keeps `tier.ai`: its
provider list is already filtered by key.

## Dependency upgrade pass

Every package that could go to latest did, ahead of launch, on the argument that
upgrading gets riskier once there are users on it. 190 outdated became 17;
vulnerabilities 242 became 43, none of them new. Sixteen packages are deliberately
short of latest and each one's commit says why — Stripe stays on 20 during launch
week, `@atproto/api` stops at 0.19.19 because 0.20 cannot be `require`d from CJS,
`google-auth-library` matches what googleapis pins, ESLint stays on 9 because
`eslint-plugin-react` has no release that survives 10.

Two traps are worth carrying forward.

**Prisma 7 needs its own deploy.** The generator is `prisma-client` now, emitting
TypeScript rather than a prebuilt client, and the service passes a `PrismaPg`
driver adapter. Run `migrate deploy` against staging before production.

**`prisma db push --accept-data-loss` will drop Mastra's tables** unless the
schema knows about them. Mastra 1.57 added eight the schema had never seen, and
push would have deleted every one. `prisma db pull` first. Do this after *any*
Mastra upgrade, not just this one.

### Tailwind 4

The migration itself was small — three of v4's four silent default changes have
no surface in this repo, and `space-y`'s new selector reaches eight files, none of
which turned out to care. `@config` keeps the JavaScript config, including its
plugins, so `tailwind-scrollbar` and the `child` variants are untouched.

Two things had to move out of the config. The six `raw` screens are
`@custom-variant` declarations in `global.css` now, because v4's legacy-config
bridge emits `@media (width >= (max-height: 800px))` for a `raw` value — not CSS.
And `tailwindcss-rtl` came out after being proved redundant: rendering the full
logical-utility set through this project's own config, with and without the
plugin, produced identical output.

The part that was not small is the cascade. **v4 puts every utility in
`@layer utilities`, and unlayered CSS beats all layered CSS whatever the source
order.** Under v3 the vendor stylesheets were plain rules above plain utilities
and lost ties; under v4 they win every one. Mantine's `button { font: inherit }`
was quietly overriding `text-[12px]` and `font-[600]` on every button in the app
— visible only because one tab label was one character too wide for its box. The
vendor imports now sit in a `vendor` layer between `base` and `components`.

If you add a third-party stylesheet to `global.css`, import it
`layer(vendor)`. The five imported from components instead were checked and are
all class-scoped, so they stay unlayered and stay code-split.

`sass` is gone. The stylesheets are `.css`, and the reformat commit is in
`.git-blame-ignore-revs` — `git config blame.ignoreRevsFile .git-blame-ignore-revs`.

### Audit pass over the upgrade

A second pass over the whole change set, looking for what the first one missed.
Five things it found.

**The vendored Blueprint stylesheet had been dead since polotno 4.** polotno 3
bundled Blueprint 5, and `polonto.css` was 397 KB of `.bp5-*` rules that styled
its editor. polotno 4 moved to Blueprint 6, renamed the namespace to `bp6` and
ships its own stylesheet, so every selector in that file stopped matching the
moment the upgrade landed. It was still being imported into `global.css`, which
is to say sent to every visitor on every page.

It took three of our own rules down with it, quietly, because they pointed at
the same namespace: the `z-index` that keeps polotno's popovers above the
composer, the focus ring inside the editor, and the `prefers-reduced-motion`
block that switches off Blueprint's three looping animations. That last one is
worth noting — **the `loops` check cannot catch it.** A loop applied by selector
never appears in any className, so there is nothing for the collector to read.
All three are retargeted to `bp6` now.

**Four different Node versions were in play**: `engines` said 22.12.0, CI said
22.12.0, two extension workflows said 20, and the container ships 22.20. Mastra
requires 22.13.0, so the declared floor was below what the tree actually needs.
Everything is 22.20.0 now, with a `.nvmrc`, and `engines` says `>=22.13.0`.

**The workspace packages were never part of the upgrade.** The root
`pnpm outdated` does not descend into them; `pnpm -r outdated` does.
`@postqueen/wallets` had three behind.

**`@atproto/api` 0.20 still cannot land, but for a different reason than
before.** 0.19 was held because `@atproto/lexicon` and `@atproto/syntax` were
circular ESM. That is fixed. What is not fixed is that 0.20 reaches
`multiformats/cid`, and `multiformats` 13 is ESM-only with no `require`
condition in its exports map — so CommonJS cannot resolve the subpath at all,
and only `multiformats` 9 has one. **The isolated `require()` test passed**,
because the main entry does not pull that path; only booting the real
application found it. This is the case `scripts/boot-check.sh` exists for.

**TypeScript 7 is out and is not a dependency upgrade.** It removes
`moduleResolution: node10`, which `tsconfig.base.json` uses and the backend and
orchestrator depend on. Moving off it changes how every import in the monorepo
resolves; the frontend only got to `bundler` as part of the Uppy 5 work. That is
its own piece of work, not a version bump. Same for `@types/node` 26, which
describes a runtime we do not run.

One warning is left in the frontend build and is expected: Uppy's dashboard
stylesheet carries an `@charset` rule, which is invalid anywhere but the first
line of a file and is ignored once inlined. The rules after it were checked in
the built bundle and are all present.

## YouTube / two-step continue picker density

**i18n +8 (channel connect copy, not a restyle of existing keys).** The OAuth
callback picker now changes shape with how many options the provider returned:
one option is a confirmation, a handful is a card grid, nine or more is a
searchable list. New `t()` keys: `confirm_channel`, `connect_this_channel`,
`ready_to_connect`, `only_option_to_connect`, plus four from the Save-path
fix that landed on the same branch (`channel_save_missing_session`,
`channel_save_network_error`, `failed_to_save_channel_configuration`,
`subtitle_connect_channel`). Search reuses `search_channels` /
`no_channels_match` / `n_channels`. The connect POST itself is unchanged.

## Continue picker item chrome

**i18n 0.** Same keys. The one-channel confirm caption no longer ends in
`connect it.` — that last word was wrapping onto its own line at the 380px
cap. Fallback for `only_option_to_connect` is now `This is the only option on
this account. Confirm to connect.` Grid/list headings dropped their leftover
colons (`select_page`, `select_linkedin_page`, `select_instagram_account`,
`select_tumblr_blog`, `select_location`). Facebook, Instagram, LinkedIn, Google
Business, and Tumblr now render the same avatar + name + meta item as YouTube,
so the shared confirm/grid/list CSS can actually size them.

## Connect marketplace IA

**i18n +59 net (Connect hub rebuilt as a job-based marketplace, not a restyle of the same keys).** The catalog and rail dropped MCP / Agent Skills / CLI / API as destinations and added Assistants / Agents / Build, Grok, Muse, Muse Code, kind-aware examples, and a credential strip. Old prompt/try keys (`conn_*_prompt_*`, `conn_*_try`, `connect_hub_mcp`, `connect_nav_cli`, …) were replaced by example and step keys (`conn_ex_*`, `conn_n8n_ex_*`, `conn_grok_*`, `conn_muse_*`, `connect_nav_assistants`, …). No API, route, gate or loop change. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only (1712 → 1771).

## Connect: no Claude Apps hub listing

**i18n −1 (`conn_docs_claude_apps_hub`).** PostQueen is not in Anthropic's Connectors Directory (`claude.com/connectors/postqueen` 404). The Claude card no longer shows a “Claude Apps hub” button. Setup is custom connector only; the note says Browse will not find her.

## Connect: Grok and Grok Bot are different products

**i18n +9 net.** Grok chat uses grok.com/connectors. Grok Bot is the cloud agent: tell it in chat to add the MCP server. grok.com/connectors does not install the Bot. Dropped `conn_grok_step_bot` / `conn_grok_step_bot_detail`. Added `conn_grok_bot_*` plus `conn_docs_grok_bot` / `conn_docs_grok_bot_guide`.

## Connect: readable card copy, no dashes

**i18n 0.** Same keys. Hub card shorts are one line (30 to 40 characters), no em/en dash, no ` - `. OpenClaw is a hosted chat bot (WhatsApp, Telegram, Slack, Discord), not a terminal agent. Cards put the name on one row and the full description underneath so the line is not clipped. Catalog and hub blurbs dropped punctuation dashes.

## Connect: All hub is grouped, not one dump

**i18n 0 net.** Dropped `connect_all_connectors`. Added `connect_view_all`. The All page no longer lists every leftover card in one mixed grid. After Featured it uses the same groups as the left rail (Assistants, Agents, Chat, Automation, Build), compact name+method cards, and a View control into that nav. Featured still shows the four full cards.

## Connect: Claude chat vs Claude Code

**i18n +1 (`conn_cc_note`).** Same pairing as ChatGPT vs Codex. Claude (claude.ai, Desktop, mobile) is the chat product: custom connector. Claude Code is the terminal/IDE agent: `claude mcp add`. Customize → Connectors does not install Claude Code. Desktop is not a third product — it shares the account connector with claude.ai.

## Connect: Grok Build, VS Code, Windsurf, Zed

**i18n +35 net.** Four clients with official installs that are not Cursor `{ mcpServers: { url } }`. Grok Build (Agents): `grok mcp add --transport http`. VS Code: `servers` plus `"type": "http"`. Windsurf Cascade: `serverUrl` in `mcp_config.json`. Zed: `context_servers` plus a Bearer header (missing header starts OAuth). Cline, Continue, Goose, Warp, JetBrains, Raycast and Copilot CLI stay on Any MCP. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Product tour: Connect hub is not one overlay step

**i18n +2 net.** Dropped `tour_clients_title` / `tour_clients_text` (the old whole-panel step that dimmed Featured). Added `tour_featured_title` / `tour_featured_text` and `tour_creds_title` / `tour_creds_text`. The tour now walks calendar → Connect (assistant vs channel) → Featured → API key strip → Channels (publishing, not assistants) → Add Channel. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Auth: Sign in and Create account on the form

**i18n +1 net.** Dropped the header pill keys (`login`, `google`, `apple`, `farcaster`) and the two-step shell keys (`continue_with`, `continue_with_email`). Added form-side mode switch and stacked provider labels (`auth_mode`, `create_account_tab`, `create_one`, `dont_have_an_account`, `already_have_an_account`, `continue_with_farcaster`, `continue_with_wallet`). `continue_with_google` / `continue_with_apple` were already present as aria-labels and are now the visible button text. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only (1817 → 1818).

## Auth: wallet login is not billing, phone email waits behind a button

**i18n +1, gates billingEnabled 60 → 55.** Continue with Wallet followed Stripe, so hosted PostQueen showed it. `WALLET_LOGIN` is now its own opt-in; login and register no longer read `billingEnabled` to mount the Solana button. On viewports below `lg`, email + password (and organization on sign-up) sit behind Continue with email, with Back in the header; desktop still shows the fields on the same screen. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` and `gates.txt`.

## Auth: polish the side screens and phone chrome

**i18n +2.** Added `forgot_password_subtitle` and `choose_a_new_password` so forgot / reset match the Sign in heading style. Phone email step hides the Sign in | Create account tabs (Back and the footer sentence do that job) and the provider screen hides the footer sentence (the tabs do that job). `scripts/ui-migration-check.sh --update` wrote `i18n.txt`.

## Auth: one screen on every viewport

**i18n -1 (`continue_with_email`).** Phone no longer hides email behind Continue with email. Sign in and Create account show Google (then Apple when `APPLE_CLIENT_ID` is set), or, then email and password on one screen. OTP still replaces only the email block. `DISABLE_REGISTRATION` hides the Create account tab and footer sentence. `scripts/ui-migration-check.sh --update` wrote `i18n.txt`.

## Connect: recategorize by what the thing is

**i18n +4 net.** Dropped Assistants and Build as destinations (`connect_nav_assistants`, `connect_hub_assistants*`, `connect_nav_build`, `connect_hub_build*`, `connect_nav_developers`, `connect_open_developers`, `conn_group_assistants*`, `conn_group_mcp_more*`). Added Bots, Editors, and a Develop rail (`connect_nav_bots`, `connect_nav_editors`, `connect_nav_public_api`, `connect_nav_cli`, `connect_nav_sdk`, `connect_nav_oauth_apps`, `connect_nav_develop`, matching hub/group keys, `connect_open_oauth_apps`).

All leftover order is now Agents, Bots, Chat, Editors, Automation. Coding agents (Claude Code, Codex, Cursor, Grok Build, Muse Code) sit under Agents. Hosted/message bots (OpenClaw, Grok Bot, Hermes, Muse) sit under Bots. VS Code, Windsurf, Zed, Gemini CLI and Any MCP sit under Editors. Public API, CLI, Node SDK and OAuth Apps are left-nav Develop rows, not Build cards. Hub cards dropped the short description; the intro stays on the detail pane. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Connect: usage examples match the surface

**i18n +22 net.** Dropped the shared three-bubble prompts (`conn_ex_list_channels`, `conn_ex_schedule_launch`, `conn_ex_cross_post`, `conn_examples_try`, `conn_bridge_prompt_*`) and the fake Muse/OAuth examples. Each live client now has its own prompt plus a reply or stdout, rendered as chat, a hosted bot thread, an agent panel, or a terminal, matching how you actually use it. Claude Code is `claude` in a session, not `claude mcp list`. The PostQueen CLI shows `integrations:list` JSON and `posts:create`. The Node SDK shows `new PostQueen` plus `integrations()` / `post()`. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Connect: documentation that matches the real setup

**i18n +34 net.** Detail pane intro is full-width under **What this is**, not cramped next to the icon. Chat cards gained per-app pairing keys (WhatsApp QR, BotFather, Slack/Discord plugins) and dropped the generic `conn_chat_step_channel*` pair. Skill bots now install the CLI as its own step. Codex can `codex mcp add`. Gemini verify is `/mcp`. API / CLI / Zapier notes state which surface can generate video, images, or analytics. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Connect: quiet hub cards, Settings exits for Webhooks and RSS

**i18n +1 (`connect_nav_settings`).** Hub cards dropped the MCP / Chat / HTTP / SOON chips that clipped names (ChatGPT in Featured). Method stays on the detail pane next to the title. Zapier and Make keep a muted `Soon` word, not a colored pill. Webhooks and RSS AutoPost left the Automation grid; they are a Settings rail that opens `/settings?tab=webhooks` and `/settings?tab=autopost`. Catalog entries remain for deep links (`?connector=webhooks`). `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Connect: examples are labeled samples, not another How to connect box

**i18n +94 net.** The detail pane treated examples as one more inner well, often a single LinkedIn bubble after eight install steps. Examples now sit above How to connect in a brand-tinted **Examples** frame (not live, N samples). Each card is numbered, titled (`One channel: Instagram`, `One channel: X`, `Several channels`, or `Check the calendar`), tagged with channel chips, and copyable. Chat/bot samples keep You vs product bubbles; WhatsApp uses voice notes, Slack/Discord use @mentions. Dropped `conn_examples_agent_panel` / `conn_examples_bot`. Added per-client `_x` / `_ig` / `_multi` keys plus `conn_examples_*` chrome. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only (1881 → 1975).

## Connect: examples last, after How to connect

**i18n 0.** Same keys. The Examples frame stays visually distinct, but it is the last block on the detail pane: intro, credentials, How to connect, then samples. It no longer sits between the info note and the install steps.

**Method is under the title, not stuck on the logo.** The MCP/Skill/Chat chip on the large icon overlapped the artwork. The icon is clean; method (and Coming soon) sit on a second line under the name.

**Hub credential strip is a card, not one mixed row.** The key sits on its own row with Reveal and Copy key. Copy MCP URL and Copy API header are actions on a second row. The dead `Authorization: KEY` chip is gone; that header is now copyable. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only (`conn_copy_key`, `conn_copy_header`; 1975 → 1977).

## Connect: one Connectors row, automation on the left rail

**i18n -3 (`connect_view_all`, `connect_nav_settings`, `conn_docs_cta`).** The Connectors heading stays. Its one child is labeled Connectors, not All. Agents / Bots / Chat / Editors / Automation left the rail; they remain group headings inside the Connectors panel. n8n, Zapier and Make sit on the rail next to Webhooks and RSS AutoPost. Webhooks and RSS still leave to Settings. `?nav=agents` and friends resolve to Connectors. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Connect: examples are photos, videos and schedules, not changelogs

**i18n 0.** Same keys. Sample prompts dropped GitHub, README, CHANGELOG and PR language. MCP cards ask to make a photo, a short video, or a visual and schedule it. Chat and skill bots attach a photo or video the user already has. n8n / Zapier / Make start from a new photo or video, not a GitHub release.

## Connect: pointer cursor on every control; Copy key left of MCP URL

**i18n +1 (`conn_go_api_keys`).** Tailwind v4 leaves native `cursor: default` on `<button>`, so Copy MCP URL and the other Connect chips did not look clickable. The panel root now sets `[&_button]:cursor-pointer` and `[&_a]:cursor-pointer`, and the shared chip / rail / hub-card classes do the same. Compact hub strip: Reveal stays on the key row; the right chip is **Go to API Keys** and opens Account → API Keys. Copy key moved to the action row, left of Copy MCP URL. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Connect: example replies answer the prompt

**i18n 0.** Same keys. Sample replies were status logs plus product splits (`Claude chat, not Claude Code`, `Enable PostQueen from +`). They now answer the prompt the way the assistant would: terrace photo drafted to Instagram tonight, same visual on three channels Friday, nothing about which Claude product this is. That distinction stays in the intro and How to connect steps.

## Connect: open a card from the top of the pane

**i18n 0.** Hub and detail share one overflow column. Scrolling the marketplace then clicking an agent kept that scrollTop, so Back and the title sat above the fold. `nav` / `picked` now reset the pane with `useLayoutEffect`, same idea as Channels `scrollResetKey`.

## Channels: detail avatar is a circle, like the rail

**i18n 0.** The rail already clipped the Facebook page photo to a circle. The detail header used `rounded-[15px]`, so the same square logo looked like a rounded tile. Channels detail and Analytics detail now use `rounded-full object-cover` and the same round platform badge as the rail.

## Channels: pick several Facebook pages in one Save

**i18n 0.** Configure Your Channel was a radio: one page, then Save, then `inBetweenSteps` was already false so a second page 400ed. Grid and list pickers are checkboxes (Select all / Clear). One POST sends `{ pages: [...] }`; the first page still fills the in-between row, extras get their own channel under the same Facebook (or Instagram / LinkedIn / YouTube / GMB / Tumblr) account. Page photos in that picker are square with a 12px radius, not circles and not stretched rectangles.

## Media library: square tiles, not 4/3 banners

**i18n 0.** The Media page and the composer picker used `aspect-[4/3]`, so a portrait photo sat in a landscape box. Import (third-party) tiles were already square. Both grids now use `aspect-square` and `object-cover`.

## Post preview matches the published crop

**i18n 0.** Instagram preview used a 585px-tall `object-cover` box (Facebook/LinkedIn 280px). A square graphic looked taller and tighter than the live post. Feed previews now measure the file and clamp to 4:5 … 1.91:1 (stories 9:16), the same range Instagram/Facebook actually show.

## Post preview: Instagram is 4:5 recommended, not forced 1:1

**i18n 0.** Square is not Instagram's 2026 default. Meta's feed stills stay native inside **4:5 … 1.91:1** (3:2 stays 3:2; 3:4 crops to 4:5). Unknown/empty cards use **4:5**, not square. A single mp4 publishes as a Reel and the feed card is **4:5** (`object-cover`, same as stills). Carousel slides lock to the first item. Profile-grid 3:4 is a different surface.

## Composer media: corner remove, not three overlay chips

**i18n +1 net.** A 48px attachment cannot hold grab dots, a close chip and an alt/sun control. Hover now leaves the image alone: the whole thumb is the drag handle, and a 16px remove sits on the top-end corner (same hanging-X pattern as the comment composer). Alt text stays in the Media Library ⋯ menu. Dropped `reorder_media` and `media_settings`. Added `copy_debug_json_admin`, `open_link`, `view_post` from the calendar / notification pass that had not updated this baseline. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Analytics empty period is not a reconnect

**i18n +1 (`no_data_in_this_period`).** The channel analytics pane treated a successful empty series the same as a 4xx / revoked token: "This channel needs to be refreshed" plus Refresh Channel. X returns `[]` when there were no tweets in the selected range, so a quiet week looked like a broken OAuth connection. Empty or all-zero series now say there is no data in this period, without the reconnect CTA. Token / 401 / 403 / missing-scope failures still throw so the pane keeps Refresh Channel. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.

## Channels: X options nests Long posts

**i18n +7.** Channels → X treated “X options” and “Verified” as two sibling tiles, so the row did not read as a child of the accordion. They now share one `pqPop` card: collapsed is a single control, expanded shows the child inset (`pqThird`, title-aligned indent, `pqLine` divider). The stored flag is still `title: "Verified"` (composer 280 vs 4000). Visible copy is **Long posts** / **X Premium character limit** — not the blue check, and not “Applies to every post on this channel.” Edit still POSTs the same JSON. Facebook / Instagram / Threads / YouTube keep returning `null` from `PublishingOptions` when `additionalSettings` is empty. Channel list selected name is semibold; empty-list hint matches settings row size. `scripts/ui-migration-check.sh --update` wrote `i18n.txt` only.
