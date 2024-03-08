import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { BillingComponent } from '@gitroom/frontend/components/billing/billing.component';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Gitroom Billing',
  description: '',
};

export default async function Page() {
  const tiers = await (await internalFetch('/user/subscription/tiers')).json();
  if (tiers?.statusCode === 402) {
    return redirect('/');
  }
  const { subscription } = await (
    await internalFetch('/user/subscription')
  ).json();

  return <BillingComponent subscription={subscription} tiers={tiers} />;
}
