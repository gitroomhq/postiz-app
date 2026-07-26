export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { ClientsComponent } from '@gitroom/frontend/components/clients/clients.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mapped Out Social' : 'Gitroom'} Clients`,
  description: '',
};

export default async function Index() {
  return <ClientsComponent />;
}
