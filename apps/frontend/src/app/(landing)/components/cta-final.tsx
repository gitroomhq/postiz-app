/**
 * CtaFinal — server component
 * Spec: Section 4 — large headline CTA with open-source trust line
 */
import Link from 'next/link';

export function CtaFinal() {
  return (
    <section className="py-20 md:py-28 bg-[#0E0E0E]">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
          Your audience is out there.
          <br />
          <span className="text-[#8B5CF6]">Start reaching them.</span>
        </h2>

        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          BB Post is free to start, open to extend, and built for businesses
          that take social media seriously.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            href="/auth"
            className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-lg px-10 py-5 font-semibold rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)]"
          >
            Create Your Free Account
          </Link>
        </div>

        <p className="text-sm text-gray-600">
          Open source · AGPL v3 · 27,800+ GitHub stars · Trusted worldwide
        </p>
      </div>
    </section>
  );
}
