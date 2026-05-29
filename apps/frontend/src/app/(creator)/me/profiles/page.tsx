/**
 * /me/profiles — creator-facing profile management.
 *
 * Lists every profile the current user has a claim on (via profile_claim) +
 * a form to add new ones. Distinct from /me which only shows snapshot data
 * for already-tracked profiles.
 *
 * Important: this page reads via profile_claim, NOT profile.creator_id.
 * That's the whole point of the junction table — a user can be a 'tracker'
 * for someone else's canonical profile without being its 'owner' creator.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';

import { AddProfileForm } from './add-profile-form';
import { removeClaim } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'My profiles — D3 Creator',
};

type Platform = 'instagram' | 'tiktok' | 'facebook' | 'rednote' | 'douyin';
type ClaimKind = 'owner' | 'tracker' | 'pending';

interface ClaimRowFromJoin {
  claim_kind: ClaimKind;
  claimed_via: string;
  created_at: string;
  confirmed_at: string | null;
  profile: {
    id: string;
    platform: Platform;
    handle: string | null;
    display_name: string | null;
    profile_url: string;
    scrape_status: string;
  } | null;
}

export default async function MyProfilesPage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  if (auth.role === 'admin') redirect('/admin');
  // No onboarding gate — anyone signed in can manage their tracked URLs here.

  const sb = await getSupabaseRoute();

  // RLS allows the user to read their own profile_claim rows (policy: "user
  // reads own claims" in 20260529000001_profile_claim.sql). The join to
  // `profile` is permitted by either "public read profile" (showcase) or
  // "user reads claimed profiles" (the new claim-based policy).
  const claimsRes = await sb
    .from('profile_claim')
    .select(
      'claim_kind, claimed_via, created_at, confirmed_at, profile:profile_id(id, platform, handle, display_name, profile_url, scrape_status)',
    )
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });

  const claims = (claimsRes.data ?? []) as unknown as ClaimRowFromJoin[];

  const owners = claims.filter((c) => c.claim_kind === 'owner' && c.profile);
  const trackers = claims.filter((c) => c.claim_kind === 'tracker' && c.profile);
  const pending = claims.filter((c) => c.claim_kind === 'pending' && c.profile);

  return (
    <div className="flex flex-col gap-10 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-aurora-cta" />
          Profiles
        </span>
        <h1 className="text-display-2 text-fg mb-4">Manage your URLs.</h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          Add an Instagram, TikTok, Facebook, RedNote, or Douyin profile URL —
          one per platform — and stats start flowing to your dashboard. Remove
          any you no longer want tracked. To change a URL, remove it and add the
          new one.
        </p>
      </header>

      <AddProfileForm />

      <Section title="Owned" empty="You haven't claimed any profiles as owner yet." rows={owners} />
      <Section title="Tracked" empty="No tracker-only profiles." rows={trackers} />
      {pending.length > 0 && (
        <Section
          title="Pending admin approval"
          empty="No pending claims."
          rows={pending}
          hint="An admin pre-added these URLs. They'll appear in your view once approved."
        />
      )}

      <div className="text-caption text-fgMuted">
        <Link href="/me" className="text-aurora-cta underline underline-offset-4">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function Section(props: {
  title: string;
  empty: string;
  rows: ClaimRowFromJoin[];
  hint?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-section text-fg">{props.title}</h2>
      {props.hint && <p className="text-caption text-fgMuted">{props.hint}</p>}
      {props.rows.length === 0 ? (
        <div className="glass-subtle border border-borderGlass rounded-2xl p-6 text-body text-fgMuted">
          {props.empty}
        </div>
      ) : (
        <ul className="divide-y divide-borderGlass border border-borderGlass rounded-2xl overflow-hidden">
          {props.rows.map((c) =>
            c.profile ? (
              <li key={c.profile.id} className="flex items-center justify-between gap-4 p-4 bg-glass-base">
                <div className="min-w-0">
                  <div className="text-label text-fgMuted uppercase tracking-wide">
                    {c.profile.platform} · {c.claim_kind}
                  </div>
                  <div className="text-body text-fg truncate">
                    {c.profile.display_name ?? c.profile.handle ?? c.profile.profile_url}
                  </div>
                  <a
                    href={c.profile.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-caption text-fgSubtle hover:text-aurora-cta underline-offset-4 hover:underline truncate block"
                  >
                    {c.profile.profile_url}
                  </a>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-caption text-fgSubtle uppercase">{c.profile.scrape_status}</span>
                  <form action={removeClaim}>
                    <input type="hidden" name="profile_id" value={c.profile.id} />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-md text-red-400 hover:bg-red-500/10 text-label border border-red-500/30"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </section>
  );
}
