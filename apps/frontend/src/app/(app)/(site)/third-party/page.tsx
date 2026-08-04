import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? 'PostQueen Integrations' : 'PostQueen Integrations'
  }`,
  description: '',
};
// Integrations became a Settings tab, where the design keeps it. The old URL
// stays alive for bookmarks and old links.
export default async function Index() {
  redirect('/settings?tab=integrations');
}
