export const dynamic = 'force-dynamic';
import { BillingComponent } from '@chaolaolo/frontend/components/billing/billing.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@chaolaolo/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Billing`,
  description: '',
};
export default async function Page() {
  return <BillingComponent />;
}
