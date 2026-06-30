import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
export const dynamic = 'force-dynamic';
import { Register } from '@gitroom/frontend/components/auth/register';
import { Metadata } from 'next';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Mapped Out Social' : 'Gitroom'} Register`,
  description: '',
};
export default async function Auth(params: {
  searchParams: Promise<{ provider: string }>;
}) {
  // Invited users carry a signed invite cookie — always let them register, even
  // when public registration is disabled.
  const hasInvite = !!(await cookies()).get('org')?.value;
  const provider = (await params?.searchParams)?.provider;
  if (
    process.env.DISABLE_REGISTRATION === 'true' &&
    !hasInvite &&
    !provider
  ) {
    // Invite-only: there is no public signup. Send visitors to the login page.
    // The very first admin (when no users exist yet) is still allowed to
    // register because canRegister returns true in that case.
    let canRegister = false;
    try {
      canRegister = (
        await (await internalFetch('/auth/can-register')).json()
      ).register;
    } catch {
      canRegister = false;
    }
    if (!canRegister) {
      redirect('/auth/login');
    }
  }
  return <Register hasInvite={hasInvite} />;
}
