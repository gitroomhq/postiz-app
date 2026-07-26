export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { ClientDashboardComponent } from '@gitroom/frontend/components/clients/client-dashboard.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mapped Out Social' : 'Gitroom'} Client`,
  description: '',
};

export default async function Index() {
  return <ClientDashboardComponent />;
}
