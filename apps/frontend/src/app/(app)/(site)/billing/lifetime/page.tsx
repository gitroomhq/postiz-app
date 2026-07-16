import { LifetimeDeal } from '@gitroom/frontend/components/billing/lifetime.deal';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getBrandName } from '@gitroom/helpers/utils/brand';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? getBrandName() : 'Gitroom'} Lifetime deal`,
  description: '',
};
export default async function Page() {
  return <LifetimeDeal />;
}
