export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { Pending } from '@gitroom/frontend/components/auth/pending';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${
    isGeneralServerSide() ? 'Postiz' : 'Gitroom'
  } - Waiting for approval`,
  description: '',
};
export default async function Auth() {
  return <Pending />;
}
