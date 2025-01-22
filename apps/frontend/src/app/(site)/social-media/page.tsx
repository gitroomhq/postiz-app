export const dynamic = 'force-dynamic';

import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import SocialMediaList from '@gitroom/frontend/components/social-media-list/social.media.list.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Social Media`,
  description: '',
};

export default async function Index() {
  return (
    <>
      <SocialMediaList />
    </>
  );
}
