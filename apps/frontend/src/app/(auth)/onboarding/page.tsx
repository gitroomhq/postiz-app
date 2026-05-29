import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@gitroom/frontend/components/auth/auth-shell';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { OnboardingForm } from './onboarding-form';

export const metadata: Metadata = {
  title: 'Connect your URLs — D3 Creator',
};

export default async function OnboardingPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  // Admins don't onboard — they manage from /admin.
  if (auth.role === 'admin') redirect('/admin');
  if (auth.creatorLink?.onboarding_completed) redirect('/me');

  return (
    <AuthShell
      eyebrow="One more step"
      heading="Connect your URLs."
      subheading="Tell us where your dashboard and leaderboard live. You can change these later."
    >
      <OnboardingForm
        defaultDashboardUrl={auth.creatorLink?.dashboard_url ?? null}
        defaultLeaderboardUrl={auth.creatorLink?.leaderboard_url ?? null}
      />
    </AuthShell>
  );
}
