export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { PostLibraryComponent } from '@gitroom/frontend/components/library/post-library.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mapped Out Social' : 'Gitroom'} Post Library`,
  description: '',
};

export default async function Index() {
  return <PostLibraryComponent />;
}
