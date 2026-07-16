import { Plugs } from '@gitroom/frontend/components/plugs/plugs';
export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getBrandName } from '@gitroom/helpers/utils/brand';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? getBrandName() : 'Gitroom'} Plugs`,
  description: '',
};
export default async function Index() {
  return <Plugs />;
}
