/**
 * BB Post Landing Page
 *
 * Server component — zero client JS at this level. All interactivity is
 * encapsulated in individual client component children (nav, hero animations,
 * features grid animations). See ui_design_spec.md Section 7 for the full
 * RSC/client split table.
 *
 * Section order (industry-validated, from competitor research BUS-110):
 * Nav → Hero → Trust → Features → How It Works → Testimonials →
 * Comparison → Mid CTA → Pricing → Final CTA → Footer
 */
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
