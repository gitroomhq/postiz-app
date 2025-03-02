import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Landing Page`,
  description: 'Welcome to the landing page',
};

export default async function LandingPage() {
  return (
    <div>
      <h1>Welcome to {isGeneralServerSide() ? 'Postiz' : 'Gitroom'}</h1>
      <p>This is the landing page.</p>
      <nav>
        <ul>
          <li>
            <Link href="/analytics">Analytics</Link>
          </li>
          <li>
            <Link href="/billing">Billing</Link>
          </li>
          <li>
            <Link href="/launches">Launches</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
