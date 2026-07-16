export const dynamic = 'force-dynamic';
import { Forgot } from '@gitroom/frontend/components/auth/forgot';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { getBrandName } from '@gitroom/helpers/utils/brand';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? getBrandName() : 'Gitroom'} Forgot Password`,
  description: '',
};
export default async function Auth() {
  return <Forgot />;
}
