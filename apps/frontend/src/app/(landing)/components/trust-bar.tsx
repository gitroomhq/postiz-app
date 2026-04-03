/**
 * TrustBar — server component (pure CSS marquee, zero JS)
 * Spec: Section 4 — stats row + infinite platform logo marquee
 *
 * FrontendDev: Add marquee keyframe to tailwind.config.js:
 *   marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } }
 * Then apply: className="flex animate-[marquee_40s_linear_infinite] gap-12 w-max"
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
              <div className="text-sm text-gray-500 mt-1">{label}</div>
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

          {/* Two copies for seamless loop — FrontendDev: add marquee keyframe to tailwind.config.js */}
          <div
            className="flex gap-12 w-max"
            style={{ animation: 'marquee 40s linear infinite' }}
          >
            {[...PLATFORMS, ...PLATFORMS].map((platform, i) => (
              <div
                key={`${platform}-${i}`}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors whitespace-nowrap px-2"
              >
                <span className="text-sm font-medium">{platform}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">
          Trusted by businesses, creators, and agencies worldwide.
        </p>
      </div>
    </section>
  );
}
