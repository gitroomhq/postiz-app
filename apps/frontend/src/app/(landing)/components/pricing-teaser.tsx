/**
 * PricingTeaser — server component
 * Spec: Section 4 — 3-column pricing (Free / Pro highlighted / Self-Host)
 */
import Link from 'next/link';
import { PRICING_TIERS } from '../data/landing';

export function PricingTeaser() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-[#1A1919]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
          Simple, transparent pricing.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 ${
                tier.highlighted
                  ? 'bg-[#8B5CF6]/10 border-2 border-[#8B5CF6]/40'
                  : 'bg-[#0E0E0E] border border-white/[0.08]'
              }`}
            >
              {/* Most popular badge */}
              {'badge' in tier ? (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {tier.badge}
                </div>
              ) : null}

              <div
                className={`text-sm font-semibold uppercase tracking-widest mb-4 ${
                  tier.highlighted ? 'text-[#A78BFA]' : 'text-gray-400'
                }`}
              >
                {tier.name}
              </div>

              <div className="mb-2">
                <span className="text-4xl font-bold text-white">{tier.price}</span>
                <span className="text-lg text-gray-500">{tier.period}</span>
              </div>

              <p className="text-gray-500 text-sm mb-6">{tier.description}</p>

              <Link
                href={tier.ctaHref}
                className={`block w-full text-center py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  tier.highlighted
                    ? 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.4)]'
                    : 'border border-white/20 hover:bg-white/5 text-white'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center mt-8">
          <Link
            href="/pricing"
            className="text-[#8B5CF6] hover:text-[#A78BFA] text-sm font-medium transition-colors duration-200"
          >
            See full pricing →
          </Link>
        </p>
      </div>
    </section>
  );
}
