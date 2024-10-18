'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useCallback, useMemo, useState } from 'react';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { Input } from '@gitroom/react/form/input';
import { Button } from '@gitroom/react/form/button';
import { useSWRConfig } from 'swr';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useRouter } from 'next/navigation';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';

import { ReactComponent as GreenCheckSvg } from '@gitroom/frontend/assets/green-check.svg';

export const LifetimeDeal = () => {
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
        body: JSON.stringify({ code }),
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

  const nextPackage = useMemo(() => {
    if (user?.tier?.current === 'STANDARD') {
      return 'PRO';
    }

    return 'STANDARD';
  }, [user?.tier]);

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
    <div className="flex gap-[30px]">
      <div className="border border-customColor6 bg-sixth p-[24px] flex flex-col gap-[20px] flex-1 rounded-[4px]">
        <div className="text-[30px]">
          Current Package:{' '}
          {user?.totalChannels > 8 ? 'EXTRA' : user?.tier?.current}
        </div>

        <div className="flex flex-col gap-[10px] justify-center text-[16px] text-customColor18">
          {features.map((feature) => (
            <div key={feature} className="flex gap-[20px]">
              <div>
                <GreenCheckSvg />
              </div>
              <div>{feature}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-customColor6 bg-sixth p-[24px] flex flex-col gap-[20px] flex-1 rounded-[4px]">
        <div className="text-[30px]">
          Next Package:{' '}
          {user?.tier?.current === 'PRO'
            ? 'EXTRA'
            : !user?.tier?.current
            ? 'FREE'
            : user?.tier?.current === 'STANDARD'
            ? 'PRO'
            : 'STANDARD'}
        </div>

        <div className="flex flex-col gap-[10px] justify-center text-[16px] text-customColor18">
          {(user?.tier?.current === 'PRO'
            ? [`${(user?.totalChannels || 0) + 5} channels`]
            : nextFeature
          ).map((feature) => (
            <div key={feature} className="flex gap-[20px]">
              <div>
                <GreenCheckSvg />
              </div>
              <div>{feature}</div>
            </div>
          ))}

          <div className="mt-[20px] flex items-center gap-[10px]">
            <div className="flex-1">
              <Input
                label="Code"
                placeholder="Enter your code"
                disableForm={true}
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <Button disabled={code.length < 4} onClick={claim}>
                Claim
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
