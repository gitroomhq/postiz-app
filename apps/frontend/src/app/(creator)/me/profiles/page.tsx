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

import { EmptyState } from '@gitroom/frontend/components/ui/empty-state';
import { PlatformPill } from '@gitroom/frontend/components/ui/platform-pill';
import type { PlatformKey } from '@gitroom/frontend/components/ui/platform-icons';

import { AddProfileForm } from './add-profile-form';
import { RemoveClaimButton } from './remove-claim-button';

// DB stores 'rednote'; the icon set keys it as 'xiaohongshu'.
function toPlatformKey(platform: string): PlatformKey {
  return platform === 'rednote' ? 'xiaohongshu' : (platform as PlatformKey);
}

type ScrapeGlyph = 'check' | 'clock' | 'x';

// Yellow-mono scrape-status badge: icon + label + yellow intensity, no hue.
function statusBadge(status: string): { cls: string; glyph: ScrapeGlyph; label: string } {
  switch (status) {
    case 'ok':
      return { cls: 'bg-brand/10 text-fg border-brand/20', glyph: 'check', label: 'Tracking' };
    case 'failed':
    case 'not_found':
      return { cls: 'bg-white/[0.04] text-fgSubtle border-white/10', glyph: 'x', label: "Couldn't fetch" };
    default:
      return { cls: 'bg-white/[0.04] text-fgMuted border-white/10', glyph: 'clock', label: 'Collecting…' };
  }
}

function ScrapeBadge({ status }: { status: string }) {
  const { cls, glyph, label } = statusBadge(status);
  const common = {
    width: 12,
    height: 12,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-caption px-2 py-0.5 rounded-full border ${cls}`}>
      {glyph === 'check' && <svg {...common}><path d="M20 6L9 17l-5-5" /></svg>}
      {glyph === 'x' && <svg {...common}><path d="M18 6L6 18M6 6l12 12" /></svg>}
      {glyph === 'clock' && <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
      {label}
    </span>
  );
}

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
        <EmptyState size="sm" title={props.empty} />
      ) : (
        <ul className="divide-y divide-borderGlass border border-borderGlass rounded-2xl overflow-hidden">
          {props.rows.map((c) =>
            c.profile ? (
              <li key={c.profile.id} className="flex items-center justify-between gap-4 p-4 bg-glass-base">
                <div className="flex items-center gap-3 min-w-0">
                  <PlatformPill platform={toPlatformKey(c.profile.platform)} iconSize={13} />
                  <div className="min-w-0">
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
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <ScrapeBadge status={c.profile.scrape_status} />
                    {c.profile.scrape_status !== 'ok' &&
                      c.profile.scrape_status !== 'failed' &&
                      c.profile.scrape_status !== 'not_found' && (
                        <span className="text-caption text-fgSubtle">First stats within ~24h</span>
                      )}
                  </div>
                  <RemoveClaimButton profileId={c.profile.id} />
                </div>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </section>
  );
}
