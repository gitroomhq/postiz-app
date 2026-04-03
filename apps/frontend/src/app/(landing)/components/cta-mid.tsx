'use client';

import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

export function CtaMid() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  return (
    <section id="cta-mid" className="bg-[#0E0E0E] py-20 px-4 sm:px-6 lg:px-8" ref={ref}>
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Ready to post smarter?
        </h2>
        <p className="mt-4 text-white/55 leading-relaxed">
          Join businesses and creators who schedule, automate, and grow with BB Post.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Free Today
          </Link>
          <Link
            href="#pricing"
            className="w-full sm:w-auto border border-white/20 hover:bg-white/5 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 text-center"
          >
            Explore Pricing
          </Link>
        </div>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-white/40">
          {['No credit card required', 'Free plan available', '14-day Pro trial included', 'Cancel anytime'].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className="text-[#8B5CF6]">✓</span>{t}
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
