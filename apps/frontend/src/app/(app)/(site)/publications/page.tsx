export const dynamic = 'force-dynamic';
import { PublicationsComponent } from '@gitroom/frontend/components/publications/publications.component';
import { Metadata } from 'next';

// postmonster: Publications page (PRD 7.1)
export const metadata: Metadata = {
  title: `Postmonster Publications`,
  description: '',
};

export default async function Index() {
  return <PublicationsComponent />;
}
