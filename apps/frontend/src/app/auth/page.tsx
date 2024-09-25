
export const dynamic = 'force-dynamic';

import { Register } from '@gitroom/frontend/components/auth/register';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Register`,
  description: '',
};

export default async function Auth() {
  return <Register />;
}
