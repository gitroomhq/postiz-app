'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { TESTIMONIALS } from '../data/landing';

function Card({ t, index }: { t: (typeof TESTIMONIALS)[number]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 2) * 0.1, ease: 'easeOut' }}
      className="bg-[#0E0E0E] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-5 hover:border-white/[0.15] transition-colors duration-300"
    >
      <div className="flex gap-1" aria-label="5 stars">
        {[...Array(5)].map((_, i) => <span key={i} className="text-[#8B5CF6] text-sm">★</span>)}
      </div>
      <blockquote className="text-sm text-white/75 leading-relaxed italic">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-3 mt-auto">
        <div className="w-9 h-9 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0">
          <span className="text-[#8B5CF6] text-xs font-bold">{t.initials}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{t.name}</p>
          <p className="text-xs text-white/40">{t.role}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function Testimonials() {
  return (
    <section className="bg-[#0E0E0E] py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] font-semibold tracking-widest text-[#8B5CF6] uppercase">Social Proof</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Teams that post more, grow more.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {TESTIMONIALS.map((t, i) => <Card key={t.name} t={t} index={i} />)}
        </div>
      </div>
    </section>
  );
}
