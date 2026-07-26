export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { AccountsComponent } from '@gitroom/frontend/components/accounts/accounts.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mapped Out Social' : 'Gitroom'} Accounts`,
  description: '',
};

export default async function Index() {
  return <AccountsComponent />;
}
