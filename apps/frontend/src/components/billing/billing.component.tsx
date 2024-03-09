"use client";

import { useCallback } from 'react';
import { NoBillingComponent } from '@gitroom/frontend/components/billing/no.billing.component';
import useSWR from 'swr';
import { LoadingComponent } from '@gitroom/frontend/components/layout/loading';
import {useFetch} from "@gitroom/helpers/utils/custom.fetch";

export const BillingComponent = () => {
  const fetch = useFetch();
  const load = useCallback(async (path: string) => {
    return await (await fetch(path)).json();
  }, []);

  const { isLoading: isLoadingTier, data: tiers } = useSWR(
    '/user/subscription/tiers',
    load
  );
  const { isLoading: isLoadingSubscription, data: subscription } = useSWR(
    '/user/subscription',
    load
  );

  if (isLoadingSubscription || isLoadingTier) {
    return <LoadingComponent />;
  }

  return <NoBillingComponent tiers={tiers} sub={subscription?.subscription} />;
};
