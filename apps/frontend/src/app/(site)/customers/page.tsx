export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import CustomerPage from '@gitroom/frontend/components/customers/customers.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Customers`,
  description: '',
};

export default async function Index() {
  return (
    <>
      <CustomerPage />
    </>
  );
}
