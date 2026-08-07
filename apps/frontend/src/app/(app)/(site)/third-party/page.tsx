import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Integrations',
};
// Integrations became a Settings tab, where the design keeps it. The old URL
// stays alive for bookmarks and old links.
export default async function Index() {
  redirect('/settings?tab=integrations');
}
