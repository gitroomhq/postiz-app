import { LifetimeDeal } from '@gitroom/frontend/components/billing/lifetime.deal';

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { isGeneral } from '@gitroom/react/helpers/is.general';

export const metadata: Metadata = {
  title: `${isGeneral() ? 'Postiz' : 'Gitroom'} Lifetime deal`,
  description: '',
};

export default async function Page() {
  return <LifetimeDeal />;
}
