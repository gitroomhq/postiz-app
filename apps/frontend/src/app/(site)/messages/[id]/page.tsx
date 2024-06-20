import { Messages } from '@gitroom/frontend/components/messages/messages';

export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { isGeneral } from '@gitroom/react/helpers/is.general';

export const metadata: Metadata = {
  title: `${isGeneral() ? 'Postiz' : 'Gitroom'} Messages`,
  description: '',
};

export default async function Index() {
  return <Messages />;
}
