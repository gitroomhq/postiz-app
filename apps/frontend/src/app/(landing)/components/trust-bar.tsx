/**
 * TrustBar — server component (pure CSS marquee, zero JS)
 * Section order: stats row → infinite platform logo scroll
 *
 * Marquee keyframe defined in landing.css (imported by layout.tsx).
 * Duplicate PLATFORMS array creates a seamless loop:
 *   translateX(-50%) returns exactly to the start position.
 * prefers-reduced-motion pauses the animation via landing.css media query.
 */
import { STATS, PLATFORMS } from '../data/landing';

export function TrustBar() {
  return (
    <section className="py-16 bg-[#0E0E0E] border-y border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
          {STATS.map(({ value, label }) => (
            <div
              key={label}
              className="text-center p-4 bg-[#1A1919] rounded-2xl border border-white/[0.08]"
            >
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-sm text-white/40 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Platform logo marquee */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div
            className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#0E0E0E] to-transparent z-10"
            aria-hidden="true"
          />
          <div
            className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#0E0E0E] to-transparent z-10"
            aria-hidden="true"
          />

          {/* Two copies for seamless loop */}
          <div
            className="flex gap-8 w-max"
            style={{ animation: 'marquee 40s linear infinite' }}
          >
            {[...PLATFORMS, ...PLATFORMS].map((platform, i) => (
              <div
                key={`${platform}-${i}`}
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2 text-white/60 hover:text-white hover:border-[#8B5CF6]/30 transition-colors whitespace-nowrap"
              >
                <span className="text-sm font-medium">{platform}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-white/30 mt-8">
          Trusted by businesses, creators, and agencies worldwide.
        </p>
      </div>
    </section>
  );
}
