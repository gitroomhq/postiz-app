export interface PricingInnerInterface {
  current: string;
  /**
   * Commercial name shown in the UI. The identifier (`current` / object key)
   * can differ — live top tier is keyed `AGENCY` but labeled "Ultimate" so we
   * do not collide with the retired `ULTIMATE` enum/pricing row.
   */
  label: string;
  /**
   * Kept so live subscriptions on an old tier still resolve, but never offered
   * for sale again. Anything that *lists plans to buy* must filter these out;
   * anything that *looks a subscriber's tier up* must not.
   */
  retired?: boolean;
  month_price: number;
  year_price: number;
  channel?: number;
  posts_per_month: number;
  team_members: boolean;
  community_features: boolean;
  featured: boolean;
  ai: boolean;
  import_from_channels: boolean;
  image_generator?: boolean;
  image_generation_count: number;
  generate_videos: number;
  public_api: boolean;
  webhooks: number;
  autoPost: boolean;
}
export interface PricingInterface {
  [key: string]: PricingInnerInterface;
}
export const pricing: PricingInterface = {
  FREE: {
    current: 'FREE',
    label: 'Free',
    month_price: 0,
    year_price: 0,
    channel: 0,
    image_generation_count: 0,
    posts_per_month: 0,
    team_members: false,
    community_features: false,
    featured: false,
    ai: false,
    import_from_channels: false,
    image_generator: false,
    public_api: false,
    webhooks: 0,
    autoPost: false,
    generate_videos: 0,
  },
  // --- the redesign's tiers ------------------------------------------------
  //
  // CREATOR / GROWTH / PRO / AGENCY replace STANDARD / TEAM / PRO / ULTIMATE.
  // The capability sets are *identical* pair for pair — same channels, images,
  // videos, webhooks, team access — so the rename is purely commercial. Only
  // the prices move.
  //
  // The old keys are kept below at their **old prices** rather than aliased to
  // these. An existing STANDARD subscriber pays $29 until they change plan;
  // Stripe never reprices an existing subscription retroactively. Aliasing them
  // here would show that customer "CREATOR — $20" while their card is charged
  // $29, which is a lie in the UI. So old subscribers keep their old tier and
  // their old number, and only new subscriptions use the tiers above.
  //
  // That also means the enum's "contract" phase — dropping the old values —
  // may never be needed. Retiring them for new signups costs nothing; deleting
  // them costs a data migration on live subscriptions.
  CREATOR: {
    current: 'CREATOR',
    label: 'Creator',
    month_price: 20,
    // 6.6x the monthly where the other three are 8x. Doc 06 §B guessed this was
    // a typo. It is not: 132 / 12 is exactly $11 a month, where 8x would be
    // $13.33. The entry tier is deliberately sweetened *and* lands on a round
    // per-month figure. Confirmed by the owner — leave it.
    year_price: 132,
    channel: 5,
    posts_per_month: 1000000,
    image_generation_count: 20,
    team_members: false,
    ai: true,
    community_features: false,
    featured: false,
    import_from_channels: true,
    image_generator: false,
    public_api: true,
    webhooks: 2,
    autoPost: false,
    generate_videos: 3,
  },
  GROWTH: {
    current: 'GROWTH',
    label: 'Growth',
    month_price: 33,
    year_price: 264,
    channel: 10,
    posts_per_month: 1000000,
    image_generation_count: 100,
    community_features: true,
    team_members: true,
    featured: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: true,
    webhooks: 10,
    autoPost: true,
    generate_videos: 10,
  },
  PRO: {
    current: 'PRO',
    label: 'Pro',
    month_price: 49,
    // 470 -> 396, the design's number, which is the 8x that makes the yearly
    // badge honest. PRO is the one tier that keeps its name, so unlike the
    // other three there is nowhere to park the legacy price: an existing
    // yearly PRO subscriber will see 396 while Stripe keeps charging them 470
    // until they change plan. Called out in the log.
    year_price: 396,
    channel: 30,
    posts_per_month: 1000000,
    image_generation_count: 300,
    community_features: true,
    team_members: true,
    featured: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: true,
    webhooks: 30,
    autoPost: true,
    generate_videos: 30,
  },
  AGENCY: {
    current: 'AGENCY',
    label: 'Ultimate',
    month_price: 99,
    year_price: 792,
    // Unlimited, decided by the owner on 2026-08-04. It was left at 100 while
    // nobody owned the call, because a channel is recurring API load and not a
    // label — unlimited channels means unlimited recurring background work.
    // Same very-large-number idiom as posts_per_month, so the display's
    // "> 10000 -> Unlimited" branch renders it without a special case.
    channel: 1000000,
    posts_per_month: 1000000,
    image_generation_count: 500,
    community_features: true,
    team_members: true,
    featured: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: true,
    webhooks: 10000,
    autoPost: true,
    generate_videos: 60,
  },

  // --- retired: kept so existing subscriptions still resolve ---------------
  STANDARD: {
    current: 'STANDARD',
    label: 'Standard',
    retired: true,
    month_price: 29,
    year_price: 278,
    channel: 5,
    posts_per_month: 1000000,
    image_generation_count: 20,
    team_members: false,
    ai: true,
    community_features: false,
    featured: false,
    import_from_channels: true,
    image_generator: false,
    public_api: true,
    webhooks: 2,
    autoPost: false,
    generate_videos: 3,
  },
  TEAM: {
    current: 'TEAM',
    label: 'Team',
    retired: true,
    month_price: 39,
    year_price: 374,
    channel: 10,
    posts_per_month: 1000000,
    image_generation_count: 100,
    community_features: true,
    team_members: true,
    featured: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: true,
    webhooks: 10,
    autoPost: true,
    generate_videos: 10,
  },
  ULTIMATE: {
    current: 'ULTIMATE',
    label: 'Ultimate',
    retired: true,
    month_price: 99,
    year_price: 950,
    channel: 100,
    posts_per_month: 1000000,
    image_generation_count: 500,
    community_features: true,
    team_members: true,
    featured: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: true,
    webhooks: 10000,
    autoPost: true,
    generate_videos: 60,
  },
};

/**
 * Every tier a *subscription row* can hold — retired ones included, because
 * live subscriptions still hold them and the code has to be able to read one.
 */
export type PaidTier =
  | 'STANDARD'
  | 'TEAM'
  | 'PRO'
  | 'ULTIMATE'
  | 'CREATOR'
  | 'GROWTH'
  | 'AGENCY';

/** What a *user* can be on, which includes having no subscription at all. */
export type AnyTier = 'FREE' | PaidTier;

/**
 * Founding-member / lifetime purchase always grants Pro — not the trial tier
 * and not one rung up the old ladder. Owner 2026-08-07.
 */
export const LIFETIME_GRANT_TIER: PaidTier = 'PRO';

/**
 * Tier granted by a founding purchase or lifetime code. Argument kept so call
 * sites stay stable; the current subscription no longer changes the grant.
 */
export const nextLifetimeTier = (_current?: string | null): PaidTier =>
  LIFETIME_GRANT_TIER;

/** Commercial plan name for UI. Falls back to the raw key if unknown. */
export function tierLabel(tier: string | undefined | null): string {
  if (!tier) return '';
  return pricing[tier]?.label ?? tier;
}

/**
 * What a yearly plan works out to per month. Every tier is priced so this lands
 * on a whole number — 11 / 22 / 33 / 66 — which is why CREATOR's yearly is 6.6x
 * its monthly and not 8x like the rest.
 */
export const effectiveMonthly = (tier: string) => {
  const plan = pricing[tier] || pricing.PRO;
  const perMonth = plan.year_price / 12;
  return perMonth % 1 === 0 ? String(perMonth) : perMonth.toFixed(2);
};

/**
 * How many months of a year a customer does not pay for by billing yearly.
 * Derived rather than written down: the badge used to be a hardcoded "20% Off",
 * which was true of the old prices and understates every current one — CREATOR
 * is 45% off, the rest are 33%.
 */
export const monthsFree = (tier: string) => {
  const plan = pricing[tier] || pricing.PRO;
  if (!plan.month_price) return 0;
  return Math.round(
    (plan.month_price * 12 - plan.year_price) / plan.month_price
  );
};

/**
 * How long the founding-member offer stays open after somebody signs up.
 *
 * The offer is genuinely time-boxed — twenty-four hours from registration — so
 * a countdown here is a fact rather than the scarcity theatre this migration
 * refused to build earlier. That refusal stands for a fabricated deadline; this
 * one is derived from `User.createdAt` and enforced below.
 */
export const LIFETIME_WINDOW_HOURS = 24;

/**
 * What the founding-member offer costs, in whole dollars.
 *
 * One figure for everybody. The tier it grants is always Pro
 * (`LIFETIME_GRANT_TIER`) — channels, AI images/videos, and plan limits come
 * from `pricing.PRO`, independent of the account's current trial or paid tier.
 *
 * Here rather than in the checkout code because the screen that shows the price
 * and the session that charges it must not be able to disagree.
 */
export const LIFETIME_PRICE = 49;

/**
 * Cancel-flow retention price for a founding-member trial: 50% off the one-time
 * founding fee ($24.50). Shown instead of the monthly 50%×3 coupon.
 */
export const LIFETIME_RETENTION_PRICE = LIFETIME_PRICE / 2;

/**
 * The founding-member window for an account, from its registration date.
 *
 * Shared rather than computed in the UI, because the screen that draws the
 * countdown and the route that takes the money have to agree about when the
 * offer closed. A clock the frontend owns alone is a clock the backend will
 * eventually disagree with.
 */
export const lifetimeWindow = (createdAt?: string | Date | null) => {
  const started = createdAt ? new Date(createdAt).getTime() : NaN;
  if (!started || Number.isNaN(started)) {
    // No registration date means no window to be inside of. Closed is the safe
    // reading: it withholds an offer rather than granting one on bad data.
    return { endsAt: null, msLeft: 0, open: false };
  }
  const endsAt = new Date(started + LIFETIME_WINDOW_HOURS * 60 * 60 * 1000);
  const msLeft = endsAt.getTime() - Date.now();
  return { endsAt, msLeft: Math.max(0, msLeft), open: msLeft > 0 };
};

/** How long a free trial runs, from the organization's registration. */
export const TRIAL_DAYS = 7;

/**
 * The free-trial window for an organization, from its registration date.
 *
 * `Organization.isTrailing` records that a trial **started**. Nothing recorded
 * that one had ended: the flag is cleared in exactly two places — Stripe's
 * `customer.subscription.updated`, and the "End free trial" button. A founding
 * member has no Stripe subscription, so no webhook is ever coming for them, and
 * nothing is scheduled anywhere in this codebase to notice. Somebody who bought
 * the lifetime deal and never pressed the button therefore stayed on trial
 * forever, with X locked and the trial banner up.
 *
 * So the end is derived, the same way `lifetimeWindow` derives the 24-hour
 * offer: the row says a trial began, this says whether it is still running. No
 * column, no cron, and nothing to drift.
 *
 * Read in one place — `auth.middleware.ts`, where `req.org` is assembled — so
 * every consumer downstream (the X lock, trial-only video, the trial banner,
 * `/billing/is-trial-finished`) gets the same answer without being patched
 * individually.
 */
export const trialWindow = (createdAt?: string | Date | null) => {
  const started = createdAt ? new Date(createdAt).getTime() : NaN;
  if (!started || Number.isNaN(started)) {
    // Unlike the lifetime offer, the safe reading here is *open*: a missing
    // registration date must not cut somebody's trial short.
    return { endsAt: null, msLeft: 0, open: true };
  }
  const endsAt = new Date(started + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const msLeft = endsAt.getTime() - Date.now();
  return { endsAt, msLeft: Math.max(0, msLeft), open: msLeft > 0 };
};
