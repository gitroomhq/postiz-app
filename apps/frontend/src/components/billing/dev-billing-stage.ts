import { Subscription } from '@prisma/client';
import {
  PaidTier,
  pricing,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

/** Prototype billingState values — client-only preview, never persisted to DB. */
export type DevBillingState =
  | 'not_started'
  | 'trial'
  | 'active'
  | 'discount'
  | 'canceling'
  | 'payment_failed'
  | 'ended'
  | 'lifetime_trial'
  | 'lifetime'
  | 'member_no_plan';

export type DevBillingTier = 'CREATOR' | 'GROWTH' | 'PRO' | 'AGENCY';

export type DevBillingStageStored = {
  billingState: DevBillingState;
  tier: DevBillingTier;
};

export const DEV_BILLING_STORAGE_KEY = 'pq-dev-billing-stage';

export const DEV_BILLING_STATES: DevBillingState[] = [
  'not_started',
  'trial',
  'active',
  'discount',
  'canceling',
  'payment_failed',
  'ended',
  'lifetime_trial',
  'lifetime',
  'member_no_plan',
];

export const DEV_BILLING_TIERS: DevBillingTier[] = [
  'CREATOR',
  'GROWTH',
  'PRO',
  'AGENCY',
];

/** Dev-on by default in development; `NEXT_PUBLIC_DEV_BILLING_STAGE=0` kills it. */
export const DEV_BILLING_STAGE =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DEV_BILLING_STAGE !== '0';

export function isDevBillingStageEnabled(): boolean {
  if (!DEV_BILLING_STAGE) return false;
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

export function readDevBillingStage(): DevBillingStageStored | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DEV_BILLING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DevBillingStageStored;
    if (
      !DEV_BILLING_STATES.includes(parsed.billingState) ||
      !DEV_BILLING_TIERS.includes(parsed.tier)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDevBillingStage(stage: DevBillingStageStored): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEV_BILLING_STORAGE_KEY, JSON.stringify(stage));
  } catch {
    /* private mode */
  }
}

export function clearDevBillingStage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DEV_BILLING_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

export function readDevBillingStageFromUrl(
  searchParams: URLSearchParams
): DevBillingStageStored | null {
  const billingState = searchParams.get(
    'billingStage'
  ) as DevBillingState | null;
  if (!billingState || !DEV_BILLING_STATES.includes(billingState)) {
    return null;
  }
  const tierParam = searchParams.get('tier') as DevBillingTier | null;
  const tier =
    tierParam && DEV_BILLING_TIERS.includes(tierParam) ? tierParam : 'PRO';
  return { billingState, tier };
}

type BaseUser = {
  tier: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  isTrailing: boolean;
  isLifetime?: boolean;
  allowTrial: boolean;
  totalChannels: number;
  orgId: string;
  admin?: boolean;
  [key: string]: unknown;
};

function effectiveTier(
  state: DevBillingState,
  tier: DevBillingTier
): string {
  if (
    state === 'not_started' ||
    state === 'ended' ||
    state === 'member_no_plan'
  ) {
    return 'FREE';
  }
  if (state === 'lifetime' || state === 'lifetime_trial') {
    return tier;
  }
  return tier;
}

/** Patch `/user/self` fields for layout gate + useUser(). */
export function mapStageToUser<T extends BaseUser>(
  base: T,
  state: DevBillingState,
  tier: DevBillingTier
): T {
  const resolvedTier = effectiveTier(state, tier);
  const tierPricing = pricing[resolvedTier];
  const paidTier = state !== 'not_started' &&
    state !== 'ended' &&
    state !== 'member_no_plan';

  return {
    ...base,
    tier: resolvedTier,
    role: state === 'member_no_plan' ? 'USER' : base.role,
    isTrailing: state === 'trial' || state === 'lifetime_trial',
    isLifetime: state === 'lifetime' || state === 'lifetime_trial',
    allowTrial: state === 'not_started',
    totalChannels: paidTier
      ? tierPricing?.channel ?? base.totalChannels
      : pricing.FREE.channel ?? base.totalChannels,
  };
}

export type DevBillingSubscriptionPayload = {
  subscription?: Subscription;
  discount?: {
    percentOff: number;
    endsAt: string | null;
    months: number | null;
  } | null;
  paymentFailed?: boolean;
};

function fakeSubscription(
  orgId: string,
  tier: PaidTier,
  opts: { cancelAt?: Date | null; isLifetime?: boolean } = {}
): Subscription {
  const p = pricing[tier];
  return {
    id: 'pq-dev-billing-sub',
    organizationId: orgId,
    subscriptionTier: tier,
    identifier: 'dev-preview',
    cancelAt: opts.cancelAt ?? null,
    period: 'MONTHLY',
    totalChannels: p?.channel ?? 1,
    isLifetime: opts.isLifetime ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

/** Fake `/user/subscription` payload for BillingComponent. */
export function mapStageToSubscription(
  orgId: string,
  state: DevBillingState,
  tier: DevBillingTier
): DevBillingSubscriptionPayload | null {
  const paidStates: DevBillingState[] = [
    'trial',
    'active',
    'discount',
    'canceling',
    'payment_failed',
    'lifetime_trial',
    'lifetime',
  ];

  if (!paidStates.includes(state)) {
    return { subscription: undefined, discount: null, paymentFailed: false };
  }

  const subTier = tier as PaidTier;
  const isLifetime = state === 'lifetime' || state === 'lifetime_trial';
  const cancelAt =
    state === 'canceling'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null;

  const subscription = fakeSubscription(orgId, subTier, {
    cancelAt,
    isLifetime,
  });

  if (state === 'discount') {
    const endsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    return {
      subscription,
      discount: { percentOff: 50, endsAt, months: 3 },
      paymentFailed: false,
    };
  }

  if (state === 'payment_failed') {
    return { subscription, discount: null, paymentFailed: true };
  }

  return { subscription, discount: null, paymentFailed: false };
}
