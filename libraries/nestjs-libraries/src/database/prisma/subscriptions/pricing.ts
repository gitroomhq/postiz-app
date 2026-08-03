export interface PricingInnerInterface {
  current: string;
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
    month_price: 20,
    // 6.6x the monthly where the other three are exactly 8x. Doc 06 §B flags
    // this as possibly a typo and it was taken from the design as-is on the
    // owner's instruction. Worth a second look before it goes near Stripe.
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
  AGENCY: {
    current: 'AGENCY',
    month_price: 99,
    year_price: 792,
    // The design says "unlimited". Left at this repo's 100 deliberately: doc 06
    // §B calls unlimited "a new product decision", and a channel is recurring
    // API load, not a label. One number to change once somebody owns that call.
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

  // --- retired: kept so existing subscriptions still resolve ---------------
  STANDARD: {
    current: 'STANDARD',
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
  PRO: {
    current: 'PRO',
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
  ULTIMATE: {
    current: 'ULTIMATE',
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
 * A lifetime code stacks the organization one tier up. The ladder has to name
 * the tiers on sale today and still understand a legacy subscriber, who sits on
 * the equivalent rung: STANDARD ~ CREATOR, TEAM ~ GROWTH, ULTIMATE ~ AGENCY.
 *
 * The redemption endpoint and the screen that previews it both read this, so
 * the tier the UI promises is the tier the backend actually grants.
 */
export type PaidTier =
  | 'STANDARD'
  | 'TEAM'
  | 'PRO'
  | 'ULTIMATE'
  | 'CREATOR'
  | 'GROWTH'
  | 'AGENCY';

export const lifetimeLadder: { [key: string]: PaidTier } = {
  FREE: 'CREATOR',
  CREATOR: 'GROWTH',
  STANDARD: 'GROWTH',
  GROWTH: 'PRO',
  TEAM: 'PRO',
  PRO: 'AGENCY',
  AGENCY: 'AGENCY',
  ULTIMATE: 'AGENCY',
};

export const nextLifetimeTier = (current?: string | null): PaidTier =>
  lifetimeLadder[current || 'FREE'] || 'CREATOR';
