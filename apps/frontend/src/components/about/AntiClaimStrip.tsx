import FadeContent from '@gitroom/frontend/components/FadeContent';

export function AntiClaimStrip() {
  return (
    <section
      aria-labelledby="about-anti-claim-heading"
      className="w-full pb-20 sm:pb-24 max-w-[1100px] mx-auto text-center"
    >
      <FadeContent>
        <h2 id="about-anti-claim-heading" className="sr-only">
          What we build
        </h2>
        <p className="text-body-lg text-fgMuted max-w-[680px] mx-auto mb-8">
          Since 2021, D3 has been building creators, founders, business owners,
          and real commercial IPs across Malaysia.
        </p>
        <p className="text-body-lg text-fgSubtle mb-8">
          <span className="line-through decoration-fgSubtle/60 mr-3">
            Not influencer vanity projects.
          </span>
          <span className="line-through decoration-fgSubtle/60 mr-3">
            Not motivational content.
          </span>
          <span className="line-through decoration-fgSubtle/60">
            Not empty views.
          </span>
        </p>
        <p className="text-display-2 text-brand max-w-[720px] mx-auto leading-[1.08] tracking-[-0.03em] font-semibold">
          We build creators that generate leads, sales, influence, and
          long-term brand value.
        </p>
      </FadeContent>
    </section>
  );
}
