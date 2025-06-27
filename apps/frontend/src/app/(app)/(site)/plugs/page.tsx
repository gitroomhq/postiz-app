import { Plugs } from '@chaolaolo/frontend/components/plugs/plugs';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@chaolaolo/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Plugs`,
  description: '',
};
export default async function Index() {
  return (
    <>
      <Plugs />
    </>
  );
}
