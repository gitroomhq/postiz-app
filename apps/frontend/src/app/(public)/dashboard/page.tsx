import { Metadata } from 'next';
import { DashboardShowcase } from '@gitroom/frontend/components/dashboard-showcase/dashboard-showcase';

export const dynamic = 'force-static';
export const revalidate = false;

export const metadata: Metadata = {
  title: 'Dashboard — D3 Creator',
  description:
    'Live overview of every creator we grow at D3 — followers, engagement, and growth across Instagram, TikTok, Facebook, Douyin, and Xiaohongshu.',
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-10 pt-12 pb-24">
      <header className="max-w-[760px]">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-subtle border border-borderGlass text-caption text-fgMuted mb-6">
          <span className="inline-block size-1.5 rounded-full bg-white/[0.78]" />
          Dashboard
        </span>
        <h1 className="text-display-2 text-fg mb-4">
          Every creator. Every platform.
        </h1>
        <p className="text-body-lg text-fgMuted max-w-[600px]">
          A live roll-up of every account we manage. Filter by platform; numbers
          refresh as our scraper collects them.
        </p>
      </header>

      <DashboardShowcase />
    </div>
  );
}
