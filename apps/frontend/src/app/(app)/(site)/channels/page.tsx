import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { ChannelsComponent } from '@gitroom/frontend/components/channels/channels.component';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'PostQueen' : 'PostQueen'} Channels`,
  description: '',
};

export default async function Page() {
  return <ChannelsComponent />;
}
