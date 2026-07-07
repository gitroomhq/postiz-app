export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { SocialComments } from '@gitroom/frontend/components/comments/social.comments';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Comments`,
  description: '',
};

export default async function Index() {
  return <SocialComments />;
}
