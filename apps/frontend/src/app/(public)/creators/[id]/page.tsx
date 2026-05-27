import { Metadata } from 'next';
import Link from 'next/link';
import { isAdmin } from '../../../admin/is-admin';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import { BentoGrid, BentoItem } from '@gitroom/frontend/components/ui/bento-grid';
import {
  PLATFORM_ICONS,
  PlatformKey,
} from '@gitroom/frontend/components/ui/platform-icons';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Creator ${id} — D3 Creator`,
    description: `Live follower counts, engagement, and growth for creator ${id} across every platform.`,
  };
}

const platforms: Array<{ slug: PlatformKey; label: string }> = [
  { slug: 'instagram', label: 'Instagram' },
  { slug: 'facebook', label: 'Facebook' },
  { slug: 'tiktok', label: 'TikTok' },
  { slug: 'douyin', label: 'Douyin' },
  { slug: 'xiaohongshu', label: 'Xiaohongshu' },
];

const headlineStats = [
  { label: 'Total Followers' },
  { label: 'Total Engagement' },
  { label: '30-Day Growth' },
];

export default async function CreatorPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const admin = await isAdmin();

  return (
    <div className="flex flex-col gap-16 pt-12 pb-24">
      {/* Header — creator identity */}
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-5">
          <div className="size-16 rounded-2xl glass-subtle border border-borderGlass overflow-hidden flex items-center justify-center text-heading text-brand font-semibold">
            {id.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-3">
              Creator Profile
            </span>
            <h1 className="text-display-2 text-fg leading-[1.04]">{id}</h1>
          </div>
        </div>
        {admin && (
          <Link
            href={`/admin/creators/${encodeURIComponent(id)}/edit`}
            data-admin-only="true"
            className="text-label px-4 py-2 rounded-lg glass-subtle border border-borderGlass text-fgMuted hover:text-fg hover:bg-white/[0.06] transition-colors whitespace-nowrap"
          >
            Edit creator
          </Link>
        )}
      </header>

      <BentoGrid gap="md">
        {headlineStats.map((stat) => (
          <BentoItem key={stat.label} colSpan={4} tabletColSpan={6}>
            <GlassCard
              variant="base"
              hover
              padding="lg"
              radius="2xl"
              className="h-full text-left"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-micro uppercase text-fgSubtle">
                  {stat.label}
                </span>
                <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
                  Soon
                </span>
              </div>
              <div className="text-[clamp(40px,5vw,56px)] leading-[1.04] tracking-[-0.03em] font-semibold text-fg">
                —
              </div>
            </GlassCard>
          </BentoItem>
        ))}
      </BentoGrid>

      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading text-fg">Platforms</h2>
          <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
            Soon
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {platforms.map((p) => {
            const Icon = PLATFORM_ICONS[p.slug];
            return (
              <Link
                key={p.slug}
                href={`/creators/${encodeURIComponent(id)}/${p.slug}`}
                className="group flex items-center justify-between p-4 rounded-xl glass-subtle border border-borderGlass hover:border-borderGlassStrong hover:bg-white/[0.04] transition-colors"
              >
                <span className="flex items-center gap-2.5 text-label text-fg">
                  <Icon size={16} className="text-fg shrink-0" />
                  {p.label}
                </span>
                <span className="text-caption text-fgSubtle group-hover:text-brand transition-colors">
                  View →
                </span>
              </Link>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading text-fg">Growth — Last 30 Days</h2>
          <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
            Soon
          </span>
        </div>
        <div className="rounded-xl bg-glass-subtle border border-borderGlass h-[280px] flex items-center justify-center">
          <p className="text-body-sm text-fgMuted">
            Chart appears once tracking starts.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
