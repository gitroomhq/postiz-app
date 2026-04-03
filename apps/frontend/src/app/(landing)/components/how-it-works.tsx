'use client';

import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { HOW_IT_WORKS_STEPS } from '../data/landing';

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  return (
    <section id="how-it-works" className="bg-[#1A1919] py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto" ref={ref}>
        <div className="text-center mb-16">
          <span className="text-[10px] font-semibold tracking-widest text-[#8B5CF6] uppercase">Get Started</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Start posting smarter in minutes.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
          <div
            aria-hidden
            className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-px bg-gradient-to-r from-transparent via-[#8B5CF6]/40 to-transparent"
          />
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
              className="flex flex-col items-center text-center gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 flex items-center justify-center shrink-0">
                <span className="text-[#8B5CF6] font-bold text-lg">0{i + 1}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{step.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-14">
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started Free — It Takes 2 Minutes
          </Link>
        </div>
      </div>
    </section>
  );
}
