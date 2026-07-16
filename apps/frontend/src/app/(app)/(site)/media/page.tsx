import { MediaLayoutComponent } from '@gitroom/frontend/components/new-layout/layout.media.component';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Lime Manager' : 'Lime Manager'} Media`,
  description: '',
};

export default async function Page() {
  return <MediaLayoutComponent />
}
