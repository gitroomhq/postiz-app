import { ConnectionsPage } from '@gitroom/frontend/components/public-api/connections.component';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? 'PostQueen Connections' : 'PostQueen Connections'
  }`,
  description: '',
};
export default async function Index() {
  return <ConnectionsPage />;
}
