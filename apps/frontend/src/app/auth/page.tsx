import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';

export const dynamic = 'force-dynamic';

import { Register } from '@gitroom/frontend/components/auth/register';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import Link from 'next/link';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Register`,
  description: '',
};

export default async function Auth() {
  if (process.env.DISABLE_REGISTRATION) {
    const canRegister = (
      await (await internalFetch('/auth/can-register')).json()
    ).register;
    if (!canRegister) {
      return (
        <div className="text-center">
          Registration is disabled
          <br />
          <Link className="underline hover:font-bold" href="/auth/login">Login instead</Link>
        </div>
      );
    }
  }

  return <Register />;
}
