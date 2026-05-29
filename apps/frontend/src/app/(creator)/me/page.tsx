import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthContext } from '@gitroom/frontend/lib/auth';
import { getSupabaseRoute } from '@gitroom/frontend/lib/supabase-route';
import { getCreatorMetrics } from '@gitroom/frontend/lib/creator-metrics';
import { EmptyState } from '@gitroom/frontend/components/ui/empty-state';
import { PLATFORM_ICONS, PLATFORM_LABELS, type PlatformKey } from '@gitroom/frontend/components/ui/platform-icons';
import { CreatorStats } from './creator-stats';

const SUPPORTED_PLATFORMS: PlatformKey[] = [
  'instagram',
  'tiktok',
  'facebook',
  'xiaohongshu',
  'douyin',
];

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'My dashboard — D3 Creator',
};

export default async function CreatorMePage() {
  const auth = await getAuthContext();
  if (!auth) redirect('/login');
  // Admins manage from /admin.
  if (auth.role === 'admin') redirect('/admin');
  // No onboarding gate: creators land here straight away. The dashboard shows
  // a friendly "add your first profile" prompt when they have no profiles yet.

  // Cookie-aware client (NOT service-role). The data tables are public-read
  // for the showcase, so the worst-case leak is bounded by what an anon
  // visitor already sees; getCreatorMetrics narrows to this user's claimed
  // profiles (or their creator_id as a legacy fallback) at the query level.
  const sb = await getSupabaseRoute();
  const creatorId = auth.creatorLink.creator_id;
  const metrics = await getCreatorMetrics(sb, { userId: auth.userId, creatorId });

  return (
    <div className="flex flex-col gap-10 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-aurora-cta" />
          My data
        </span>
        <h1 className="text-display-2 text-fg mb-4">Your creator view.</h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          Signed in as <span className="text-fg">{auth.email}</span>. Live stats
          across every profile you own or track —{' '}
          <Link href="/me/profiles" className="text-aurora-cta underline underline-offset-4">
            manage your URLs
          </Link>
          .
        </p>
      </header>

      {!metrics.hasProfiles ? (
        <EmptyState
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 3v18h18" />
              <path d="M7 15l3-3 3 2 4-5" />
            </svg>
          }
          title="Track your first profile"
          description="Paste an Instagram, TikTok, Facebook, RedNote, or Douyin profile URL — daily stats appear on this dashboard within 24 hours."
          action={{ href: '/me/profiles', label: 'Add a profile' }}
        >
          <div className="flex items-center gap-2.5 mt-1">
            {SUPPORTED_PLATFORMS.map((p) => {
              const Icon = PLATFORM_ICONS[p];
              return (
                <span
                  key={p}
                  title={PLATFORM_LABELS[p]}
                  className="flex items-center justify-center size-9 rounded-full glass-base border border-borderGlass text-fgMuted"
                >
                  <Icon size={16} />
                </span>
              );
            })}
          </div>
        </EmptyState>
      ) : (
        <CreatorStats metrics={metrics} />
      )}
    </div>
  );
}
