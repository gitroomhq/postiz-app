'use client';

import { useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { MainBillingComponent } from './main.billing.component';
export const BillingComponent = () => {
  const fetch = useFetch();
  const user = useUser();
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
  const { isLoading: isLoadingSubscription, data: subscription } = useSWR(
    isOrgAdmin ? '/user/subscription' : null,
    load
  );
  if (!isOrgAdmin) {
    return (
      <div className="p-[24px] text-[16px]">
        {t(
          'billing_admin_only',
          'Only a workspace admin can manage billing. Please ask an admin of this workspace.'
        )}
      </div>
    );
  }
  if (isLoadingSubscription || isLoadingTier) {
    return <LoadingComponent />;
  }
  return (
    <MainBillingComponent
      sub={subscription?.subscription}
      discount={subscription?.discount}
    />
  );
};
