export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Activate } from '@chaolaolo/frontend/components/auth/activate';
import { isGeneralServerSide } from '@chaolaolo/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'
    } - Activate your account`,
  description: '',
};
export default async function Auth() {
  return <Activate />;
}
