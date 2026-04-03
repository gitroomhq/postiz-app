'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { FEATURES } from '../data/landing';

const ICONS: Record<string, string> = {
  Calendar: '📅',
  Sparkles: '✨',
  Zap: '⚡',
  BarChart3: '📊',
  Users: '👥',
  Code2: '🔓',
};

function FeatureCard({ feature, index }: { feature: (typeof FEATURES)[number]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 3) * 0.08, ease: 'easeOut' }}
      className="bg-[#1A1919] border border-white/[0.08] rounded-2xl p-7 flex flex-col gap-4 hover:border-[#8B5CF6]/30 transition-colors duration-300"
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl" role="img" aria-label={feature.eyebrow}>
          {ICONS[feature.icon] ?? '🔹'}
        </span>
        <div>
          <span className="text-[10px] font-semibold tracking-widest text-[#8B5CF6] uppercase">
            {feature.eyebrow}
          </span>
          <h3 className="mt-1 text-lg font-bold text-white leading-snug">{feature.title}</h3>
        </div>
      </div>
      <p className="text-sm text-white/55 leading-relaxed">{feature.body}</p>
      <ul className="flex flex-col gap-2 mt-auto">
        {feature.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-white/60">
            <span className="mt-0.5 text-[#8B5CF6] shrink-0">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="bg-[#0E0E0E] py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] font-semibold tracking-widest text-[#8B5CF6] uppercase">Features</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Everything you need to post consistently and grow.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.eyebrow} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
