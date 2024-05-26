import { isGeneral } from '@gitroom/react/helpers/is.general';

export const dynamic = 'force-dynamic';

import { BillingComponent } from '@gitroom/frontend/components/billing/billing.component';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: `${isGeneral() ? 'Postiz' : 'Gitroom'} Billing`,
  description: '',
};

export default async function Page() {
  return <BillingComponent />;
}
