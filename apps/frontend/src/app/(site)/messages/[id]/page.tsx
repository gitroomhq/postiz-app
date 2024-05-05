import { Messages } from '@gitroom/frontend/components/messages/messages';

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gitroom Messages',
  description: '',
};

export default async function Index() {
  return <Messages />;
}
