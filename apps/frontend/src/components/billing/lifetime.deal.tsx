'use client';

import { FC } from 'react';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LIFETIME_PRICE,
  lifetimeWindow,
  nextLifetimeTier,
  pricing,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useRouter } from 'next/navigation';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
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
 * What a founding member sees instead of the claim form.
 *
 * Copy is the design's, verbatim from `ltThanksText`, `ltHeroSub`, `ltHeroPrice`
 * and the facts row — including the split the prototype makes between someone
 * still inside their trial ("Nothing has been charged yet") and someone who has
 * paid ("One payment, done"). Getting that backwards would tell a person they
 * had been charged when they had not.
 *
 * The plan named is the one on the account, not a fixed 'PRO' — the prototype
 * hardcodes a fallback because it has no account to read.
 */
const FoundingMember: FC<{ tier: string; trialing: boolean }> = ({
  tier,
  trialing,
}) => {
  const t = useT();
  const plan = pricing[tier] ? tier : 'PRO';
  const channels = pricing[plan]?.channel ?? 0;

  const facts: Array<[string, string, boolean]> = [
    [t('lt_renews', 'RENEWS'), t('lt_never', 'Never'), true],
    [
      t('lt_future_updates', 'FUTURE UPDATES'),
      t('lt_included', 'Included'),
      false,
    ],
    [
      t('lt_channels', 'CHANNELS'),
      channels > 10000
        ? t('plan_unlimited_channels', 'Unlimited channels')
        : t('plan_n_channels', '{{count}} channels', { count: channels }),
      false,
    ],
  ];

  return (
    <div
      data-founding-member="1"
      className="flex flex-col gap-[18px] rounded-pqLg border border-pqLtAmber/40 bg-pqInner p-[24px]"
    >
      <span
        data-founding-badge="1"
        className="w-fit rounded-[6px] bg-pqLtAmber/15 px-[10px] py-[4px] text-[11px] font-[800] uppercase tracking-[0.05em] text-pqLtAmber"
      >
        {t('founding_member', 'Founding member')}
      </span>

      <div className="flex flex-col gap-[6px]">
        <div className="text-[13px] font-[600] text-pqLtAmber">
          {trialing
            ? t(
                'lt_thanks_trial',
                'Thank you for backing PostQueen this early.'
              )
            : t('lt_thanks_paid', 'Thank you for backing PostQueen early.')}
        </div>
        <div className="font-display text-[28px] font-[600] -tracking-[0.015em]">
          {t('lt_you_are_founding', 'You are a founding member')}
        </div>
        <div className="max-w-[560px] text-[13.5px] leading-[1.55] text-pqMuted">
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

      <div className="grid grid-cols-3 gap-[10px] mobile:grid-cols-1">
        {facts.map(([label, value, amber]) => (
          <div
            key={label}
            data-founding-fact={label}
            className="rounded-pqMd border border-pqBorder p-[14px]"
          >
            <div className="text-[11px] font-[700] uppercase tracking-[0.06em] text-pqSoft">
              {label}
            </div>
            <div
              className={
                'mt-[4px] text-[16px] font-[600] ' +
                (amber ? 'text-pqLtAmber' : 'text-pqText')
              }
            >
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LifetimeDeal = () => {
  const t = useT();
  const fetch = useFetch();
  const user = useUser();
  const [code, setCode] = useState('');
  const toast = useToaster();
  const { mutate } = useSWRConfig();
  const router = useRouter();
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
    const channelsOr = currentPricing.channel;
    const list = [];
    list.push(
      `${user.totalChannels} ${
        user.totalChannels === 1 ? 'channel' : 'channels'
      }`
    );
    list.push(
      `${
        currentPricing.posts_per_month > 10000
          ? 'Unlimited'
          : currentPricing.posts_per_month
      } posts per month`
    );
    if (currentPricing.team_members) {
      list.push(`Unlimited team members`);
    }
    if (currentPricing?.ai) {
      list.push(`AI auto-complete`);
    }
    return list;
  }, [user]);
  const nextFeature = useMemo(() => {
    if (!user?.tier) {
      return [];
    }
    const currentPricing = pricing[nextPackage];
    const channelsOr = currentPricing.channel;
    const list = [];
    list.push(`${channelsOr} ${channelsOr === 1 ? 'channel' : 'channels'}`);
    list.push(
      `${
        currentPricing.posts_per_month > 10000
          ? 'Unlimited'
          : currentPricing.posts_per_month
      } posts per month`
    );
    if (currentPricing.team_members) {
      list.push(`Unlimited team members`);
    }
    if (currentPricing?.ai) {
      list.push(`AI auto-complete`);
    }
    return list;
  }, [user, nextPackage]);
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
      <div className="flex gap-[30px]">
        <div className="border border-pqLine bg-sixth p-[24px] flex flex-col gap-[20px] flex-1 rounded-[4px]">
          <div className="text-[30px]">
            {t('current_package', 'Current Package:')}
            {user?.totalChannels > 8 ? 'EXTRA' : user?.tier?.current}
          </div>

          <div className="flex flex-col gap-[10px] justify-center text-[16px] text-pqMuted">
            {features.map((feature) => (
              <div key={feature} className="flex gap-[20px]">
                <div className="text-pqOk">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M16.2806 9.21937C16.3504 9.28903 16.4057 9.37175 16.4434 9.46279C16.4812 9.55384 16.5006 9.65144 16.5006 9.75C16.5006 9.84856 16.4812 9.94616 16.4434 10.0372C16.4057 10.1283 16.3504 10.211 16.2806 10.2806L11.0306 15.5306C10.961 15.6004 10.8783 15.6557 10.7872 15.6934C10.6962 15.7312 10.5986 15.7506 10.5 15.7506C10.4014 15.7506 10.3038 15.7312 10.2128 15.6934C10.1218 15.6557 10.039 15.6004 9.96938 15.5306L7.71938 13.2806C7.57865 13.1399 7.49959 12.949 7.49959 12.75C7.49959 12.551 7.57865 12.3601 7.71938 12.2194C7.86011 12.0786 8.05098 11.9996 8.25 11.9996C8.44903 11.9996 8.6399 12.0786 8.78063 12.2194L10.5 13.9397L15.2194 9.21937C15.289 9.14964 15.3718 9.09432 15.4628 9.05658C15.5538 9.01884 15.6514 8.99941 15.75 8.99941C15.8486 8.99941 15.9462 9.01884 16.0372 9.05658C16.1283 9.09432 16.211 9.14964 16.2806 9.21937ZM21.75 12C21.75 13.9284 21.1782 15.8134 20.1068 17.4168C19.0355 19.0202 17.5127 20.2699 15.7312 21.0078C13.9496 21.7458 11.9892 21.9389 10.0979 21.5627C8.20656 21.1865 6.46928 20.2579 5.10571 18.8943C3.74215 17.5307 2.81355 15.7934 2.43735 13.9021C2.06114 12.0108 2.25422 10.0504 2.99218 8.26884C3.73013 6.48726 4.97982 4.96451 6.58319 3.89317C8.18657 2.82183 10.0716 2.25 12 2.25C14.585 2.25273 17.0634 3.28084 18.8913 5.10872C20.7192 6.93661 21.7473 9.41498 21.75 12ZM20.25 12C20.25 10.3683 19.7661 8.77325 18.8596 7.41655C17.9531 6.05984 16.6646 5.00242 15.1571 4.37799C13.6497 3.75357 11.9909 3.59019 10.3905 3.90852C8.79017 4.22685 7.32016 5.01259 6.16637 6.16637C5.01259 7.32015 4.22685 8.79016 3.90853 10.3905C3.5902 11.9908 3.75358 13.6496 4.378 15.1571C5.00242 16.6646 6.05984 17.9531 7.41655 18.8596C8.77326 19.7661 10.3683 20.25 12 20.25C14.1873 20.2475 16.2843 19.3775 17.8309 17.8309C19.3775 16.2843 20.2475 14.1873 20.25 12Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>{feature}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-pqLine bg-sixth p-[24px] flex flex-col gap-[20px] flex-1 rounded-[4px]">
          <div className="text-[30px]">
            {t('next_package', 'Next Package:')}
            {nextPackage}
          </div>

          <div className="flex flex-col gap-[10px] justify-center text-[16px] text-pqMuted">
            {(user?.tier?.current === 'PRO'
              ? [`${(user?.totalChannels || 0) + 5} channels`]
              : nextFeature
            ).map((feature) => (
              <div key={feature} className="flex gap-[20px]">
                <div className="text-pqOk">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M16.2806 9.21937C16.3504 9.28903 16.4057 9.37175 16.4434 9.46279C16.4812 9.55384 16.5006 9.65144 16.5006 9.75C16.5006 9.84856 16.4812 9.94616 16.4434 10.0372C16.4057 10.1283 16.3504 10.211 16.2806 10.2806L11.0306 15.5306C10.961 15.6004 10.8783 15.6557 10.7872 15.6934C10.6962 15.7312 10.5986 15.7506 10.5 15.7506C10.4014 15.7506 10.3038 15.7312 10.2128 15.6934C10.1218 15.6557 10.039 15.6004 9.96938 15.5306L7.71938 13.2806C7.57865 13.1399 7.49959 12.949 7.49959 12.75C7.49959 12.551 7.57865 12.3601 7.71938 12.2194C7.86011 12.0786 8.05098 11.9996 8.25 11.9996C8.44903 11.9996 8.6399 12.0786 8.78063 12.2194L10.5 13.9397L15.2194 9.21937C15.289 9.14964 15.3718 9.09432 15.4628 9.05658C15.5538 9.01884 15.6514 8.99941 15.75 8.99941C15.8486 8.99941 15.9462 9.01884 16.0372 9.05658C16.1283 9.09432 16.211 9.14964 16.2806 9.21937ZM21.75 12C21.75 13.9284 21.1782 15.8134 20.1068 17.4168C19.0355 19.0202 17.5127 20.2699 15.7312 21.0078C13.9496 21.7458 11.9892 21.9389 10.0979 21.5627C8.20656 21.1865 6.46928 20.2579 5.10571 18.8943C3.74215 17.5307 2.81355 15.7934 2.43735 13.9021C2.06114 12.0108 2.25422 10.0504 2.99218 8.26884C3.73013 6.48726 4.97982 4.96451 6.58319 3.89317C8.18657 2.82183 10.0716 2.25 12 2.25C14.585 2.25273 17.0634 3.28084 18.8913 5.10872C20.7192 6.93661 21.7473 9.41498 21.75 12ZM20.25 12C20.25 10.3683 19.7661 8.77325 18.8596 7.41655C17.9531 6.05984 16.6646 5.00242 15.1571 4.37799C13.6497 3.75357 11.9909 3.59019 10.3905 3.90852C8.79017 4.22685 7.32016 5.01259 6.16637 6.16637C5.01259 7.32015 4.22685 8.79016 3.90853 10.3905C3.5902 11.9908 3.75358 13.6496 4.378 15.1571C5.00242 16.6646 6.05984 17.9531 7.41655 18.8596C8.77326 19.7661 10.3683 20.25 12 20.25C14.1873 20.2475 16.2843 19.3775 17.8309 17.8309C19.3775 16.2843 20.2475 14.1873 20.25 12Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>{feature}</div>
              </div>
            ))}

            <div className="mt-[20px] flex items-center gap-[10px]">
              <div className="flex-1">
                <Input
                  label="Code"
                  translationKey="label_code"
                  placeholder="Enter your code"
                  disableForm={true}
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div>
                <Button disabled={code.length < 4} onClick={claim}>
                  {t('claim', 'Claim')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
