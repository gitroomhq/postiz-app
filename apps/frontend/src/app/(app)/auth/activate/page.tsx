export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Activate } from '@gitroom/frontend/components/auth/activate';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getBrandName } from '@gitroom/helpers/utils/brand';
export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? getBrandName() : 'Gitroom'
  } - Activate your account`,
  description: '',
};
export default async function Auth() {
  return <Activate />;
}
