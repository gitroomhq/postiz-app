import FadeContent from '@gitroom/frontend/components/FadeContent';

export function InfrastructureQuote() {
  return (
    <section
      aria-labelledby="about-infrastructure-heading"
      className="w-full pb-20 sm:pb-24 max-w-[1100px] mx-auto"
    >
      <FadeContent>
        <h2 id="about-infrastructure-heading" className="sr-only">
          Short video is infrastructure
        </h2>
        <blockquote className="text-display-2 text-fg tracking-[-0.03em] leading-[1.06] max-w-[820px] mx-auto">
          <div>Short video is no longer entertainment.</div>
          <div className="text-brand">It is infrastructure.</div>
        </blockquote>
        <p className="font-mono text-body-sm text-fgMuted mt-6 max-w-[680px]">
          A personal IP today is what a website was 10 years ago. Every
          founder, every business, every brand will eventually need one.
        </p>
      </FadeContent>
    </section>
  );
}
