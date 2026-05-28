import Link from 'next/link';
import { AuroraButton } from '@gitroom/frontend/components/ui/aurora-button';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';
import FadeContent from '@gitroom/frontend/components/FadeContent';

export function ClosingMission() {
  return (
    <section
      aria-labelledby="about-mission-heading"
      className="w-full pb-24 max-w-[1100px] mx-auto px-6 md:px-8"
    >
      <FadeContent>
        <GlassCard
          variant="base"
          padding="lg"
          radius="3xl"
          className="flex flex-col gap-8 sm:gap-10 sm:p-12 lg:p-16"
        >
          <p className="text-micro uppercase text-fgSubtle tracking-[0.35em]">
            Our mission
          </p>

          <h2
            id="about-mission-heading"
            className="text-display-2 text-fg tracking-[-0.03em] leading-[1.04] max-w-[760px] text-balance"
          >
            More <span className="text-brand">creators</span>. More{' '}
            <span className="text-brand">founders</span>. More{' '}
            <span className="text-brand">businesses</span>.
          </h2>

          <p className="text-body-lg text-fgMuted max-w-[640px] leading-relaxed">
            Helping Malaysia use content to actually change lives — leads,
            sales, real commercial IP. D3 is both a creator growth ecosystem
            and an operating company built on that thesis.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
            <Link href="/dashboard" className="contents">
              <AuroraButton variant="cta" size="lg">
                Open the dashboard
              </AuroraButton>
            </Link>
            <Link href="/leaderboard" className="contents">
              <AuroraButton variant="ghost" size="lg">
                See the leaderboard
              </AuroraButton>
            </Link>
          </div>
        </GlassCard>
      </FadeContent>
    </section>
  );
}
