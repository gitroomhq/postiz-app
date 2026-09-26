import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Register } from '@gitroom/frontend/components/auth/register';
import { InviteRegister } from '@gitroom/frontend/components/auth/invite-register';
import { EarlyAccess } from '@gitroom/frontend/components/auth/early-access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Postmonster Register`,
  description: '',
};

// postmonster: closed access (PRD 6) - /auth/register is invite-gated when
// DISABLE_REGISTRATION=true
export default async function RegisterPage(params: {
  searchParams: Promise<{
    invite?: string;
    provider?: string;
    code?: string;
  }>;
}) {
  const search = (await params?.searchParams) || {};
  const invite = typeof search.invite === 'string' ? search.invite : '';
  const provider = typeof search.provider === 'string' ? search.provider : '';
  const code = typeof search.code === 'string' ? search.code : '';

  // OAuth completion landing (login of already registered users)
  if (provider && code) {
    return <Register />;
  }

  if (invite) {
    return <InviteRegister token={invite} />;
  }

  const registrationDisabled = process.env.DISABLE_REGISTRATION === 'true';
  // a team invite (?org= JWT cookie) is an invite into an existing workspace
  // and keeps its upstream registration path
  const orgInvite = (await cookies()).get('org')?.value;

  if (!registrationDisabled || orgInvite) {
    return <Register />;
  }

  return <EarlyAccess />;
}
