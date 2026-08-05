export const dynamic = 'force-dynamic';
import { BillingComponent } from '@gitroom/frontend/components/billing/billing.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'PostQueen' : 'PostQueen'} Billing`,
  description: '',
};
export default async function Page() {
  return (
    <div className="bg-pqInner flex-1 flex-col flex overflow-y-auto p-[24px_28px_48px]">
      <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col">
        <BillingComponent />
      </div>
    </div>
  );
}
