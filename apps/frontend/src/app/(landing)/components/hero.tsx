'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Transition } from 'framer-motion';

const EASE: Transition = { duration: 0.6, ease: 'easeOut' };

const visible = { opacity: 1, y: 0 };
const hidden = { opacity: 0, y: 24 };

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 py-20 bg-[#0E0E0E] overflow-hidden">
      {/* Decorative purple glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#8B5CF6]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center max-w-4xl mx-auto gap-6">
        {/* Pre-headline badge */}
        <motion.div
          initial={reduced ? false : hidden}
          animate={visible}
          transition={{ ...EASE, delay: 0 }}
        >
          <span className="inline-flex items-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-full px-4 py-1.5 text-sm text-[#A78BFA] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
            Open Source · AGPL v3 · 27,800+ GitHub Stars
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={reduced ? false : hidden}
          animate={visible}
          transition={{ ...EASE, delay: 0.1 }}
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1]"
        >
          All your social media.{' '}
          <span className="text-[#8B5CF6]">One smart dashboard.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={reduced ? false : hidden}
          animate={visible}
          transition={{ ...EASE, delay: 0.2 }}
          className="text-lg md:text-xl text-white/60 max-w-2xl leading-relaxed"
        >
          BB Post is an open-source social media scheduler built for businesses and creators
          who want real results. Schedule, automate, analyze, and collaborate across 19+
          platforms — free to start.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={reduced ? false : hidden}
          animate={visible}
          transition={{ ...EASE, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/auth/register"
            className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 py-4 text-base font-semibold rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Free — No Credit Card Required
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto border border-white/20 hover:bg-white/5 text-white px-8 py-4 text-base font-semibold rounded-xl transition-all duration-200 text-center"
          >
            See How It Works
          </a>
        </motion.div>

        {/* Micro-copy */}
        <motion.p
          initial={reduced ? false : hidden}
          animate={visible}
          transition={{ ...EASE, delay: 0.4 }}
          className="text-sm text-white/40"
        >
          Free plan available · Pro trial included · Cancel anytime
        </motion.p>

        {/* Stat row */}
        <motion.div
          initial={reduced ? false : hidden}
          animate={visible}
          transition={{ ...EASE, delay: 0.5 }}
          className="flex items-center gap-8 flex-wrap justify-center pt-4"
        >
          {[
            { value: '19+', label: 'Platforms' },
            { value: '27.8k', label: 'GitHub Stars' },
            { value: '100%', label: 'Open Source' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <span className="block text-2xl font-bold text-white">{value}</span>
              <span className="block text-xs text-white/40 mt-0.5">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
