import { Automations } from '@gitroom/frontend/components/automations/automations';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Automations`,
  description: '',
};
export default async function Index() {
  return <Automations />;
}
