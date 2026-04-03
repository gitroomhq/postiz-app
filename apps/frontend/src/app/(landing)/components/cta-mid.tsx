/**
 * CtaMid — server component
 * Spec: Section 4 — gradient card CTA with trust signals
 */
import Link from 'next/link';

const TRUST_SIGNALS = [
  'No credit card required',
  'Free plan available',
  '14-day Pro trial included',
  'Cancel anytime',
] as const;

export function CtaMid() {
  return (
    <section className="py-20 md:py-28 bg-[#0E0E0E]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#1A1919] to-[#0E0E0E] border border-[#8B5CF6]/30 p-10 md:p-16 text-center overflow-hidden">
          {/* Background glow */}
          <div
            className="absolute inset-0 bg-[#8B5CF6]/5 rounded-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to post smarter?
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
              Join businesses and creators who schedule, automate, and grow with BB Post.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Link
                href="/auth"
                className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 py-4 text-base font-semibold rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
              >
                Start Free Today
              </Link>
              <Link
                href="#pricing"
                className="w-full sm:w-auto border border-white/20 hover:bg-white/5 text-white px-8 py-4 text-base font-semibold rounded-xl transition-all duration-200 text-center"
              >
                Explore Pricing
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
              {TRUST_SIGNALS.map((signal) => (
                <span key={signal} className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[#8B5CF6] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
