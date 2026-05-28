import Link from 'next/link';
import { AuroraButton } from '@gitroom/frontend/components/ui/aurora-button';
import FadeContent from '@gitroom/frontend/components/FadeContent';

export function TransparencyManifesto() {
  return (
    <section
      aria-labelledby="about-transparency-heading"
      className="w-full pb-20 sm:pb-24 max-w-[1100px] mx-auto text-center"
    >
      <FadeContent>
        <h2
          id="about-transparency-heading"
          className="text-display-2 text-fg mb-6 max-w-[760px] mx-auto leading-[1.08] tracking-[-0.03em] text-balance"
        >
          That&apos;s why D3 Creator exists.
        </h2>
        <p className="text-body-lg text-fgMuted max-w-[680px] mx-auto mb-8">
          Instead of showing screenshots or edited case studies, we made our
          creator ecosystem public. Followers, views, engagement, growth
          rankings, and live performance are displayed transparently across
          every platform we operate.
        </p>
        <p className="text-body-lg text-fg max-w-[640px] mx-auto mb-10">
          In our culture,{' '}
          <span className="text-brand font-medium">numbers</span> speak louder
          than promises.
        </p>
        <Link href="/leaderboard" className="contents">
          <AuroraButton variant="cta" size="lg">
            See the live leaderboard
          </AuroraButton>
        </Link>
      </FadeContent>
    </section>
  );
}
