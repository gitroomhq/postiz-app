export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { MediaLibraryComponent } from '@gitroom/frontend/components/library/media-library.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mapped Out Social' : 'Gitroom'} Media Library`,
  description: '',
};

export default async function Index() {
  return <MediaLibraryComponent />;
}
