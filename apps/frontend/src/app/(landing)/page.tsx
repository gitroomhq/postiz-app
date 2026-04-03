// Force dynamic rendering — framer-motion v12 hooks require request-time context.
// The layout handles all metadata/SEO; this prevents static prerender failures.
export const dynamic = 'force-dynamic';

import { Nav } from './components/nav';
import { Hero } from './components/hero';
import { TrustBar } from './components/trust-bar';
import { Features } from './components/features';
import { HowItWorks } from './components/how-it-works';
import { Testimonials } from './components/testimonials';
import { Comparison } from './components/comparison';
import { CtaMid } from './components/cta-mid';
import { PricingTeaser } from './components/pricing-teaser';
import { CtaFinal } from './components/cta-final';
import { Footer } from './components/footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0E0E0E]">
      <Nav />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Comparison />
      <CtaMid />
      <PricingTeaser />
      <CtaFinal />
      <Footer />
    </main>
  );
}
