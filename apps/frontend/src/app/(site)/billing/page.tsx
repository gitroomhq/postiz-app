import { BillingComponent } from '@gitroom/frontend/components/billing/billing.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gitroom Billing',
  description: '',
};

export default async function Page() {
  return <BillingComponent />;
}
