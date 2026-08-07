import { Metadata } from 'next';
import { ChannelsComponent } from '@gitroom/frontend/components/channels/channels.component';

export const metadata: Metadata = {
  title: 'Channels',
};

export default async function Page() {
  return <ChannelsComponent />;
}
