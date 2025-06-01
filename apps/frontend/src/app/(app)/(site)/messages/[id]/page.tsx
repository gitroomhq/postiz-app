import { Messages } from '@gitroom/frontend/components/messages/messages';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Messages`,
  description: '',
};
export default async function Index() {
  return <Messages />;
}
