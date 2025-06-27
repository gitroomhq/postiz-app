import { ThirdPartyComponent } from '@chaolaolo/frontend/components/third-parties/third-party.component';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@chaolaolo/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz Integrations' : 'Gitroom Integrations'
    }`,
  description: '',
};
export default async function Index() {
  return <ThirdPartyComponent />;
}
