'use client';

import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

export function CtaFinal() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  return (
    <section className="bg-[#0E0E0E] py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-15" style={{ background: 'radial-gradient(ellipse at center, #8B5CF6 0%, transparent 70%)' }} />
      <motion.div
        ref={ref}
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className="relative z-10 max-w-3xl mx-auto text-center"
      >
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Your audience is out there.{' '}
          <span className="text-[#8B5CF6]">Start reaching them.</span>
        </h2>
        <p className="mt-4 text-white/55 leading-relaxed">
          BB Post is free to start, open to extend, and built for businesses that take social media seriously.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Create Your Free Account
          </Link>
        </div>
        <p className="mt-6 text-xs text-white/30">
          Open source · AGPL v3 · 27,800+ GitHub Stars · Trusted worldwide
        </p>
      </motion.div>
    </section>
  );
}
