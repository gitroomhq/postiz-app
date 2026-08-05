'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { MainBillingComponent } from './main.billing.component';
import { useDevBillingStageOptional } from '@gitroom/frontend/components/billing/dev-billing-stage.provider';

export const BillingComponent = () => {
  const fetch = useFetch();
  const user = useUser();
  const devBilling = useDevBillingStageOptional();
  const t = useT();
  // Both endpoints below are ADMIN-gated. The page is directly navigable, so
  // without this a regular member fired two 402s and sat on a spinner.
  const isOrgAdmin = ['ADMIN', 'SUPERADMIN'].includes(user?.role!);
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);
  const { isLoading: isLoadingTier, data: tiers } = useSWR(
    isOrgAdmin ? '/user/subscription/tiers' : null,
    load
  );
  const devOverrideActive =
    !!devBilling?.active && !!devBilling.subscriptionOverride;
  const { isLoading: isLoadingSubscription, data: subscription } = useSWR(
    isOrgAdmin && !devOverrideActive ? '/user/subscription' : null,
    load
  );
  if (!isOrgAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center p-[56px_24px]">
        <div className="flex max-w-[520px] flex-col items-center gap-[16px] text-center">
          <span className="grid size-[56px] place-items-center rounded-full bg-pqSettings text-pqSoft">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.9"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="font-display text-[24px] font-[700] -tracking-[0.02em] text-pqText">
            {t('billing_admin_only_title', 'Billing is managed by admins')}
          </h1>
          <p className="text-[16px] leading-[1.6] text-pqMuted">
            {t(
              'billing_admin_only',
              'Only a workspace admin can manage billing. Please ask an admin of this workspace.'
            )}
          </p>
        </div>
      </div>
    );
  }
  if (!devOverrideActive && (isLoadingSubscription || isLoadingTier)) {
    return <LoadingComponent />;
  }

  const subPayload = devOverrideActive
    ? devBilling!.subscriptionOverride!
    : subscription;

  return (
    <MainBillingComponent
      sub={subPayload?.subscription}
      discount={subPayload?.discount}
      paymentFailed={subPayload?.paymentFailed}
    />
  );
};
