'use client';

import { FC } from 'react';
import clsx from 'clsx';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LIFETIME_PRICE,
  lifetimeWindow,
  nextLifetimeTier,
  pricing,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useRouter } from 'next/navigation';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';

/**
 * The design's feature tick: a 17×17 brand tile with a white check, 13px muted
 * label — and the "Unlimited channels" line lifted to `--focused`/600 with the
 * `pqunlim` glow (gated by `pq-loop` for prefers-reduced-motion, the global.scss
 * convention). One recipe for the plan cards and both lifetime package cards,
 * so the tick cannot drift between surfaces.
 */
export const FeatureRow: FC<{ label: string; unlim?: boolean }> = ({
  label,
  unlim,
}) => (
  <div
    data-plan-feature="1"
    className={clsx(
      'flex items-start gap-[9px] text-[13px] leading-[1.5]',
      unlim
        ? 'pq-loop animate-pqUnlim font-[600] text-pqFocused'
        : 'text-pqMuted'
    )}
  >
    <span className="mt-[1px] grid size-[17px] shrink-0 place-items-center rounded-[5px] bg-pqBrand text-pqOnBrand">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none">
        <path
          d="m5 12.5 4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    <span>{label}</span>
  </div>
);
/**
 * How long the founding-member offer has left, ticking.
 *
 * The window is real — twenty-four hours from registration — and the route that
 * redeems a code refuses once it closes, so this is a countdown to something
 * that happens. Earlier in this migration a lifetime countdown was declined on
 * the grounds that it counted down to nothing; that objection was about a
 * fabricated deadline and does not apply to this one.
 *
 * Both sides read `lifetimeWindow()`, so the clock on screen and the rule on
 * the server cannot disagree.
 */
const LifetimeCountdown: FC<{ createdAt?: string | Date }> = ({
  createdAt,
}) => {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const window_ = useMemo(() => lifetimeWindow(createdAt), [createdAt, now]);

  if (!window_.endsAt) return null;

  if (!window_.open) {
    return (
      <div
        data-lifetime-window="closed"
        className="rounded-pqMd border border-pqBorder p-[14px] text-[13px] text-pqMuted"
      >
        {t(
          'lifetime_window_closed',
          'The founding-member offer closed 24 hours after you signed up.'
        )}
      </div>
    );
  }

  const total = Math.floor(window_.msLeft / 1000);
  const parts = [
    Math.floor(total / 3600),
    Math.floor((total % 3600) / 60),
    total % 60,
  ].map((n) => String(n).padStart(2, '0'));

  return (
    <div
      data-lifetime-window="open"
      className="flex items-center gap-[12px] rounded-pqMd bg-pqBrandSoft p-[14px]"
    >
      <span
        data-lifetime-remaining={total}
        className="font-display text-[22px] font-[600] tabular-nums text-pqBrand"
      >
        {parts.join(':')}
      </span>
      <span className="flex-1 text-[13px] leading-[1.45] text-pqText">
        {t(
          'lifetime_window_open',
          'left to claim founding-member pricing. The offer closes 24 hours after you sign up.'
        )}
      </span>
      <BuyLifetime />
    </div>
  );
};

/**
 * The purchase itself.
 *
 * Only ever rendered inside the open branch above, so it cannot offer a closed
 * deal — and the route refuses anyway, because a hidden button is a UI decision
 * and the window is a rule.
 *
 * The price comes from `pricing.ts`, the same constant the checkout session
 * charges. Reading it here rather than writing "$49" in the markup is what
 * stops the screen and the charge from disagreeing.
 */
const BuyLifetime: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const toast = useToaster();
  const [busy, setBusy] = useState(false);

  const buy = useCallback(async () => {
    setBusy(true);
    try {
      const { url } = await (
        await fetch('/billing/lifetime-checkout', { method: 'POST' })
      ).json();
      if (url) {
        window.location.href = url;
        return;
      }
      toast.show(t('something_went_wrong', 'Something went wrong'), 'warning');
    } finally {
      setBusy(false);
    }
  }, [fetch, t, toast]);

  return (
    <button
      type="button"
      data-lifetime-buy="1"
      disabled={busy}
      onClick={buy}
      className="shrink-0 rounded-pqSm bg-pqBrand px-[16px] py-[9px] text-[13.5px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover disabled:opacity-60"
    >
      {t('lifetime_buy', 'Become a founding member — ${{price}}', {
        price: LIFETIME_PRICE,
      })}
    </button>
  );
};

/**
 * What a founding member sees instead of the claim form — the design's amber
 * hero: crown chip, "PostQueen {tier}" with the FOUNDING MEMBER pill, the heart
 * line, a price cluster, and (once paid) the facts row.
 *
 * Copy is the design's, verbatim from `ltThanksText`, `ltHeroSub`, `ltHeroPrice`
 * and the facts row — including the split the prototype makes between someone
 * still inside their trial ("Nothing has been charged yet") and someone who has
 * paid ("One payment, done"). Getting that backwards would tell a person they
 * had been charged when they had not.
 *
 * The plan named is the one on the account, not a fixed 'PRO' — the prototype
 * hardcodes a fallback because it has no account to read. The design's MEMBER
 * SINCE cell renders only when the caller can pass a real date (the Billing
 * screen has the subscription row's `createdAt`; the user context on
 * /billing/lifetime does not), so the row is 4 cells there and 3 here.
 */
export const FoundingMember: FC<{
  tier: string;
  trialing: boolean;
  memberSince?: string | Date | null;
}> = ({ tier, trialing, memberSince }) => {
  const t = useT();
  const plan = pricing[tier] ? tier : 'PRO';
  const channels = pricing[plan]?.channel ?? 0;

  const facts: Array<[string, string, boolean]> = [];
  if (memberSince) {
    facts.push([
      t('lt_member_since', 'MEMBER SINCE'),
      newDayjs(memberSince).local().format('D MMM YYYY'),
      false,
    ]);
  }
  facts.push([t('lt_renews', 'RENEWS'), t('lt_never', 'Never'), true]);
  facts.push([
    t('lt_future_updates', 'FUTURE UPDATES'),
    t('lt_included', 'Included'),
    false,
  ]);
  facts.push([
    t('lt_channels', 'CHANNELS'),
    channels > 10000
      ? t('plan_unlimited_channels', 'Unlimited channels')
      : t('plan_n_channels', '{{count}} channels', { count: channels }),
    false,
  ]);

  return (
    <div
      data-founding-member="1"
      className="relative overflow-hidden rounded-[18px] bg-pqLtCardOn p-[24px] outline outline-1 -outline-offset-1 outline-pqLtOutline"
    >
      <div className="flex flex-wrap items-start gap-[16px]">
        <span className="grid size-[46px] shrink-0 place-items-center rounded-[14px] bg-pqLtChipBg text-pqLtAmber">
          <svg viewBox="0 0 24 24" width="23" height="23" fill="none">
            <path
              d="m5 17 1.2-8.4 3.6 2.9L12 6.5l2.2 5 3.6-2.9L19 17H5Zm0 2.5h14"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-[240px] flex-1">
          <div className="flex flex-wrap items-center gap-[9px]">
            <span className="font-display text-[22px] font-[600] -tracking-[0.02em] text-pqText">
              {t('lt_hero_title', 'PostQueen {{plan}}', { plan })}
            </span>
            <span
              data-founding-badge="1"
              className="grid h-[21px] place-items-center rounded-full bg-pqLtSolid px-[10px] text-[10px] font-[800] uppercase tracking-[0.05em] text-pqLtSolidFg"
            >
              {t('founding_member', 'Founding member')}
            </span>
          </div>
          <div className="mt-[9px] flex items-center gap-[8px] text-[13.5px] font-[600] text-pqLtAmber">
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="currentColor"
              className="shrink-0"
            >
              <path d="M12 20.5 4.2 13a4.6 4.6 0 0 1 6.5-6.5l1.3 1.3 1.3-1.3A4.6 4.6 0 1 1 19.8 13L12 20.5Z" />
            </svg>
            {trialing
              ? t(
                  'lt_thanks_trial',
                  'Thank you for backing PostQueen this early.'
                )
              : t('lt_thanks_paid', 'Thank you for backing PostQueen early.')}
          </div>
          <div className="mt-[5px] text-[13.5px] text-pqText">
            {trialing
              ? t(
                  'lt_hero_sub_trial',
                  'Nothing has been charged yet. Everything in {{plan}} is already unlocked while your trial runs.',
                  { plan }
                )
              : t(
                  'lt_hero_sub_paid',
                  'One payment, done. You keep PostQueen {{plan}} and everything we build for it, with nothing to renew.',
                  { plan }
                )}
          </div>
        </div>
        <div className="min-w-[120px] text-end">
          <div className="font-display text-[26px] font-[700] -tracking-[0.02em] text-pqLtAmber">
            {trialing ? '$0' : `$${LIFETIME_PRICE}`}
          </div>
          <div className="mt-[2px] text-[12px] text-pqSoft">
            {trialing
              ? t('lt_due_today', 'due today')
              : t('lt_paid_once', 'paid once')}
          </div>
        </div>
      </div>
      {!trialing && (
        <div className="mt-[20px] flex flex-wrap border-t border-pqLtLine2 pt-[16px]">
          {facts.map(([label, value, amber]) => (
            <div
              key={label}
              data-founding-fact={label}
              className="min-w-[140px] flex-1 pe-[18px]"
            >
              <div className="text-[10.5px] font-[700] tracking-[0.07em] text-pqLtLabel">
                {label}
              </div>
              <div
                className={clsx(
                  'mt-[5px] text-[14.5px] font-[600] -tracking-[0.01em]',
                  amber ? 'text-pqLtAmber' : 'text-pqText'
                )}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * The "Lifetime deal" heading plus the Current / Next package cards with the
 * code-claim form. One component because two screens render the identical
 * surface: /billing/lifetime, and the Billing page itself once the account is a
 * founding member.
 */
export const LifetimePackages: FC = () => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const [code, setCode] = useState('');
  const toast = useToaster();
  const { mutate } = useSWRConfig();
  const fireEvents = useFireEvents();
  const claim = useCallback(async () => {
    const { success } = await (
      await fetch('/billing/lifetime', {
        body: JSON.stringify({
          code,
        }),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    ).json();
    if (success) {
      mutate('/user/self');
      toast.show('Successfully claimed the code');
      fireEvents('lifetime_claimed');
    } else {
      toast.show('Code already claimed or invalid code', 'warning');
    }
    setCode('');
  }, [code]);
  // The ladder is shared with the redemption endpoint so this preview always
  // names the tier the backend will actually grant.
  const nextPackage = useMemo(
    () => nextLifetimeTier(user?.tier?.current),
    [user?.tier]
  );
  const features = useMemo(() => {
    if (!user?.tier) {
      return [];
    }
    const currentPricing = user?.tier;
    const list: Array<{ label: string; unlim?: boolean }> = [];
    // Same very-large-number reading as the plan cards' Features — a channel
    // count that means "unlimited" says so instead of printing the sentinel.
    list.push(
      user.totalChannels > 10000
        ? {
            label: t('plan_unlimited_channels', 'Unlimited channels'),
            unlim: true,
          }
        : user.totalChannels === 1
        ? { label: t('plan_one_channel', '1 channel') }
        : {
            label: t('plan_n_channels', '{{count}} channels', {
              count: user.totalChannels,
            }),
          }
    );
    list.push(
      currentPricing.posts_per_month > 10000
        ? { label: t('plan_unlimited_posts', 'Unlimited posts per month') }
        : {
            label: t('plan_n_posts', '{{count}} posts per month', {
              count: currentPricing.posts_per_month,
            }),
          }
    );
    if (currentPricing.team_members) {
      list.push({ label: t('plan_unlimited_team', 'Unlimited team members') });
    }
    if (currentPricing?.ai) {
      list.push({ label: t('plan_ai_autocomplete', 'AI auto-complete') });
    }
    return list;
  }, [user, t]);
  const nextFeature = useMemo(() => {
    if (!user?.tier) {
      return [];
    }
    const currentPricing = pricing[nextPackage];
    const channelsOr = currentPricing.channel ?? 0;
    const list: Array<{ label: string; unlim?: boolean }> = [];
    list.push(
      channelsOr > 10000
        ? {
            label: t('plan_unlimited_channels', 'Unlimited channels'),
            unlim: true,
          }
        : channelsOr === 1
        ? { label: t('plan_one_channel', '1 channel') }
        : {
            label: t('plan_n_channels', '{{count}} channels', {
              count: channelsOr,
            }),
          }
    );
    list.push(
      currentPricing.posts_per_month > 10000
        ? { label: t('plan_unlimited_posts', 'Unlimited posts per month') }
        : {
            label: t('plan_n_posts', '{{count}} posts per month', {
              count: currentPricing.posts_per_month,
            }),
          }
    );
    if (currentPricing.team_members) {
      list.push({ label: t('plan_unlimited_team', 'Unlimited team members') });
    }
    if (currentPricing?.ai) {
      list.push({ label: t('plan_ai_autocomplete', 'AI auto-complete') });
    }
    return list;
  }, [user, nextPackage, t]);
  if (!user?.tier) {
    return null;
  }
  return (
    <div className="flex flex-col gap-[20px]">
      <h3 className="font-display text-[19px] font-[600] -tracking-[0.015em] text-pqText">
        {t('lifetime_deal', 'Lifetime deal')}
      </h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[13px]">
        <div className="flex flex-col gap-[14px] rounded-[14px] bg-pqInner p-[20px] outline outline-1 -outline-offset-1 outline-pqBorder">
          <div className="text-[12px] font-[600] uppercase tracking-[0.06em] text-pqSoft">
            {t('current_package', 'Current package')}
          </div>
          <div className="font-display text-[24px] font-[600] -tracking-[0.02em] text-pqText">
            {user?.totalChannels > 8 ? 'EXTRA' : user?.tier?.current}
          </div>
          <div className="flex flex-col gap-[9px]">
            {features.map((feature) => (
              <FeatureRow key={feature.label} {...feature} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[14px] rounded-[14px] bg-pqInner p-[20px] outline outline-[1.5px] -outline-offset-1 outline-pqBrand">
          <div className="text-[12px] font-[600] uppercase tracking-[0.06em] text-pqBrand">
            {t('next_package', 'Next package')}
          </div>
          <div className="font-display text-[24px] font-[600] -tracking-[0.02em] text-pqText">
            {nextPackage}
          </div>
          <div className="flex flex-col gap-[9px]">
            {(user?.tier?.current === 'PRO'
              ? [
                  {
                    label: t('plan_n_channels', '{{count}} channels', {
                      count: (user?.totalChannels || 0) + 5,
                    }),
                  },
                ]
              : nextFeature
            ).map((feature) => (
              <FeatureRow key={feature.label} {...feature} />
            ))}
          </div>
          <div className="mt-[4px] flex items-end gap-[9px]">
            <label className="flex min-w-0 flex-1 flex-col gap-[6px]">
              <span className="text-[12px] font-[600] tracking-[0.02em] text-pqMuted">
                {t('label_code', 'Code')}
              </span>
              <input
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('enter_your_code', 'Enter your code')}
                className="h-[40px] w-full rounded-[10px] bg-pqBg px-[12px] font-mono text-[13px] tracking-[0.05em] text-pqText shadow-[inset_0_0_0_1px_var(--border)] outline-none placeholder:text-pqSoft focus:shadow-[inset_0_0_0_1px_var(--fieldRing)]"
              />
            </label>
            <button
              type="button"
              disabled={code.length < 4}
              onClick={claim}
              className="h-[40px] shrink-0 rounded-[10px] bg-pqBrand px-[18px] text-[13.5px] font-[600] text-pqOnBrand transition-colors hover:bg-pqBrandHover disabled:pointer-events-none disabled:opacity-50"
            >
              {t('claim', 'Claim')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const LifetimeDeal = () => {
  const user = useUser();
  const router = useRouter();
  if (!user?.tier) {
    return null;
  }
  if (user?.id && user?.tier?.current !== 'FREE' && !user?.isLifetime) {
    router.replace('/billing');
    return null;
  }
  return (
    <div className="flex flex-col gap-[20px]">
      {user?.isLifetime ? (
        <FoundingMember
          tier={user?.tier?.current || 'PRO'}
          trialing={!!user?.isTrailing}
        />
      ) : (
        <LifetimeCountdown createdAt={user?.createdAt} />
      )}
      <LifetimePackages />
    </div>
  );
};
