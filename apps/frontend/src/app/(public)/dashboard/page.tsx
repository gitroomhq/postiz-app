import { Metadata } from 'next';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import { BentoGrid, BentoItem } from '@gitroom/frontend/components/ui/bento-grid';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Dashboard — D3 Creator',
  description:
    'Live overview of every creator we grow at D3 — followers, engagement, and growth across Instagram, TikTok, Facebook, Douyin, and Xiaohongshu.',
};

const summaryStats = [
  { label: 'Total Followers', note: 'Combined reach across every creator.' },
  { label: 'Total Engagement', note: 'Likes, comments, and shares — last 30 days.' },
  { label: 'Active Creators', note: 'Creators currently tracked.' },
  { label: '30-Day Growth', note: 'New followers added in the last 30 days.' },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-16 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-brand" />
          Dashboard
        </span>
        <h1 className="text-display-2 text-fg mb-4">
          Every creator. Every platform.
        </h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          A live roll-up of every account we manage. Numbers refresh as our
          scraper collects them.
        </p>
      </header>

      <BentoGrid gap="md">
        {summaryStats.map((stat) => (
          <BentoItem key={stat.label} colSpan={3} tabletColSpan={6}>
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
              <div className="text-[clamp(36px,4vw,48px)] leading-[1.04] tracking-[-0.03em] font-semibold text-fg mb-3">
                —
              </div>
              <p className="text-body-sm text-fgMuted">{stat.note}</p>
            </GlassCard>
          </BentoItem>
        ))}

        <BentoItem colSpan={8} rowSpan={2} tabletColSpan={6}>
          <GlassCard variant="base" padding="lg" radius="2xl" className="h-full">
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
        </BentoItem>

        <BentoItem colSpan={4} rowSpan={2} tabletColSpan={6}>
          <GlassCard variant="base" padding="lg" radius="2xl" className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading text-fg">Tracked Creators</h2>
              <span className="text-caption px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-fgMuted">
                Soon
              </span>
            </div>
            <div className="rounded-xl bg-glass-subtle border border-borderGlass h-[280px] p-8 flex items-center justify-center text-center">
              <p className="text-body-sm text-fgMuted">
                Creator list appears once admin adds profiles.
              </p>
            </div>
          </GlassCard>
        </BentoItem>
      </BentoGrid>
    </div>
  );
}
