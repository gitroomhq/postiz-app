import { Metadata } from 'next';
import { D3LogoParticles } from '@gitroom/frontend/components/reactbits/d3-logo-particles';

export const metadata: Metadata = {
  title: 'Logo preview — D3 Creator',
  robots: { index: false, follow: false },
};

/**
 * Scratch preview route — renders D3LogoParticles at multiple sizes against
 * the dark canvas so the brand asset can be inspected in isolation. Not
 * linked from anywhere; remove when no longer needed.
 */
export default function LogoPreviewPage() {
  return (
    <main className="w-full py-20">
      <div className="max-w-[1100px] mx-auto px-6 md:px-8 flex flex-col gap-16">
        <header className="flex flex-col gap-2">
          <p className="text-micro uppercase text-fgSubtle tracking-[0.35em]">
            Scratch preview · not linked
          </p>
          <h1 className="text-display-2 text-fg tracking-[-0.03em]">
            D3 Logo Particles
          </h1>
          <p className="text-body-lg text-fgMuted max-w-[640px]">
            Sources from <code className="font-mono text-fg">/d3-logo.png</code>,
            samples opaque pixels, scatters on hover. Hover near each canvas
            to test the interaction.
          </p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-end">
          <figure className="flex flex-col items-center gap-3">
            <D3LogoParticles size={200} className="cursor-crosshair" />
            <figcaption className="text-caption text-fgSubtle font-mono tabular-nums">
              200px · default density
            </figcaption>
          </figure>
          <figure className="flex flex-col items-center gap-3">
            <D3LogoParticles size={320} className="cursor-crosshair" />
            <figcaption className="text-caption text-fgSubtle font-mono tabular-nums">
              320px · default density
            </figcaption>
          </figure>
          <figure className="flex flex-col items-center gap-3">
            <D3LogoParticles
              size={400}
              particleCount={20000}
              className="cursor-crosshair"
            />
            <figcaption className="text-caption text-fgSubtle font-mono tabular-nums">
              400px · denser (20k particles)
            </figcaption>
          </figure>
        </section>

        <section className="border-t border-borderGlass pt-12">
          <p className="text-micro uppercase text-fgSubtle tracking-[0.35em] mb-4">
            Reference
          </p>
          <div className="flex flex-wrap items-end gap-6">
            <figure className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/d3-logo.png"
                alt="D3 reference logo"
                width={200}
                height={200}
              />
              <figcaption className="text-caption text-fgSubtle font-mono">
                /d3-logo.png · 200px
              </figcaption>
            </figure>
          </div>
        </section>
      </div>
    </main>
  );
}
