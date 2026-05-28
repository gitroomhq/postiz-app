import { DottedSurface } from '@gitroom/frontend/components/reactbits/dotted-surface';
import FadeContent from '@gitroom/frontend/components/FadeContent';

export function ManifestoOpening() {
  return (
    <DottedSurface className="w-screen ml-[calc(50%-50vw)] mr-[calc(50%-50vw)]">
      <section
        aria-labelledby="about-manifesto-heading"
        className="w-full pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-32 lg:pb-36 max-w-[1100px] mx-auto px-6 md:px-8"
      >
        <FadeContent>
          <p className="text-micro uppercase text-fgSubtle tracking-[0.35em] mb-6">
            About D3
          </p>

          <h1
            id="about-manifesto-heading"
            className="text-[clamp(48px,8vw,112px)] leading-[0.98] tracking-[-0.04em] font-semibold text-fg max-w-[820px]"
          >
            It&apos;s not <span className="text-brand">talent</span>.
          </h1>

          <p className="mt-6 text-body-lg text-fgMuted max-w-[520px] leading-relaxed">
            Most people don&apos;t fail at content because they aren&apos;t
            talented. They fail because nobody ever taught them how to turn
            attention into business.
          </p>
        </FadeContent>
      </section>
    </DottedSurface>
  );
}
