import { Metadata } from 'next';
import Link from 'next/link';
import { CreatorRowActions } from './creators/creator-row-actions';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import { AuroraButton } from '@gitroom/frontend/components/ui/aurora-button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin — D3 Creator',
  description: '',
};

const mockCreators: Array<{
  id: string;
  name: string;
  platforms: string[];
}> = [
  {
    id: 'demo-creator',
    name: 'Demo Creator',
    platforms: ['Instagram', 'TikTok', 'Xiaohongshu'],
  },
];

export default function AdminHomePage() {
  return (
    <div className="flex flex-col gap-12 pt-12 pb-24">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-[640px]">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
            <span className="inline-block size-1.5 rounded-full bg-brand" />
            Tracked Creators
          </span>
          <h1 className="text-display-2 text-fg mb-4">
            Manage creator profiles
          </h1>
          <p className="text-body-lg text-fgMuted">
            Add the URLs of creator profiles you want to track. The scraper
            picks them up automatically and they appear on the public showcase.
          </p>
        </div>
        <Link href="/admin/creators/new" className="contents">
          <AuroraButton variant="cta" size="md" icon={<span aria-hidden="true">+</span>}>
            Add creator
          </AuroraButton>
        </Link>
      </header>

      <GlassCard variant="base" padding="lg" radius="2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-heading text-fg">All creators</h2>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted">
            Mock data
          </span>
        </div>

        <div className="rounded-xl overflow-hidden border border-borderGlass">
          <div className="grid grid-cols-[1fr_2fr_160px] gap-4 px-5 py-3 bg-white/[0.03] text-micro uppercase text-fgSubtle border-b border-borderGlass">
            <div>Creator</div>
            <div>Platforms</div>
            <div className="text-right">Actions</div>
          </div>
          {mockCreators.map((c, i) => (
            <div
              key={c.id}
              className={`grid grid-cols-[1fr_2fr_160px] gap-4 px-5 py-4 items-center transition-colors hover:bg-white/[0.03] ${i < mockCreators.length - 1 ? 'border-b border-borderGlass' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-glass-subtle border border-borderGlass flex items-center justify-center text-label text-brand font-semibold">
                  {c.name.charAt(0)}
                </div>
                <span className="text-body-sm text-fg font-medium">
                  {c.name}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.platforms.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <CreatorRowActions id={c.id} name={c.name} />
            </div>
          ))}
        </div>

        <p className="text-caption text-fgSubtle mt-4">
          Live data lands once the scraper backend ships. Until then this list
          is a fixed mock.
        </p>
      </GlassCard>
    </div>
  );
}
