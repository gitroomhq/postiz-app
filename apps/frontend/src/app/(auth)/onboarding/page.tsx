import { redirect } from 'next/navigation';
import { getAuthContext } from '@gitroom/frontend/lib/auth';

// Onboarding is deprecated as a gate — creators self-provision on first
// profile-add and manage everything from /me. This route now just forwards:
// admins to their dashboard, creators to account settings (where the old
// display-name / dashboard / leaderboard fields now live, editable anytime).
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (auth.role === 'admin') redirect('/admin');
  redirect('/me/account');
}
