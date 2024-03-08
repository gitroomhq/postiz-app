import { FC } from 'react';
import { Subscription } from '@prisma/client';
import {
  NoBillingComponent,
  Tiers,
} from '@gitroom/frontend/components/billing/no.billing.component';

export const BillingComponent: FC<{
  subscription?: Subscription;
  tiers: Tiers;
}> = (props) => {
  const { subscription, tiers } = props;
  return <NoBillingComponent tiers={tiers} sub={subscription} />;
};
