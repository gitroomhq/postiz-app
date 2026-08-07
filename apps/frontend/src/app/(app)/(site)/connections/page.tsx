import { ConnectionsPage } from '@gitroom/frontend/components/public-api/connections.component';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Connections',
};
export default async function Index() {
  return <ConnectionsPage mode="page" />;
}
