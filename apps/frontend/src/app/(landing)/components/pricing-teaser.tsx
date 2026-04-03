'use client';

import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { PRICING_TIERS } from '../data/landing';

export function PricingTeaser() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  return (
    <section id="pricing" className="bg-[#1A1919] py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto" ref={ref}>
        <div className="text-center mb-12">
          <span className="text-[10px] font-semibold tracking-widest text-[#8B5CF6] uppercase">Pricing</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Simple, transparent pricing.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PRICING_TIERS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className={`rounded-2xl p-7 flex flex-col gap-3 border ${
                plan.highlighted
                  ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/40 ring-1 ring-[#8B5CF6]/20'
                  : 'bg-[#0E0E0E] border-white/[0.08]'
              }`}
            >
              {'badge' in plan && plan.badge && (
                <span className="text-[10px] font-bold tracking-widest text-[#8B5CF6] uppercase">{plan.badge}</span>
              )}
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <p className="text-2xl font-bold text-white">
                {plan.price}<span className="text-base font-normal text-white/40">{plan.period}</span>
              </p>
              <p className="text-sm text-white/55 leading-relaxed">{plan.description}</p>
              <Link
                href={plan.ctaHref}
                className={`mt-3 text-center text-sm font-semibold px-6 py-2.5 rounded-lg transition-all duration-200 ${
                  plan.highlighted
                    ? 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white'
                    : 'border border-white/20 hover:bg-white/5 text-white/70 hover:text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
