'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { COMPARISON_ROWS, type ComparisonRow } from '../data/landing';

function Cell({ value, highlight }: { value: ComparisonRow[keyof ComparisonRow]; highlight?: boolean }) {
  const cls = highlight ? 'py-4 px-4 text-center text-sm bg-[#8B5CF6]/5' : 'py-4 px-4 text-center text-sm';
  if (typeof value === 'boolean') {
    return (
      <td className={cls}>
        {value
          ? <span className={`font-bold ${highlight ? 'text-[#8B5CF6]' : 'text-white/70'}`}>✓</span>
          : <span className="text-white/25">—</span>}
      </td>
    );
  }
  return (
    <td className={cls}>
      <span className={highlight ? 'text-[#8B5CF6] font-bold' : 'text-white/60'}>{String(value)}</span>
    </td>
  );
}

export function Comparison() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const reduced = useReducedMotion();

  return (
    <section className="bg-[#1A1919] py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto" ref={ref}>
        <div className="text-center mb-12">
          <span className="text-[10px] font-semibold tracking-widest text-[#8B5CF6] uppercase">Comparison</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white tracking-tight">
            More platform. More power. Less price.
          </h2>
        </div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="overflow-x-auto rounded-2xl border border-white/[0.08]"
        >
          <table className="w-full min-w-[540px]">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="py-4 px-4 text-left text-sm font-medium text-white/40 w-2/5">Feature</th>
                <th className="py-4 px-4 text-center text-sm font-bold text-[#8B5CF6] bg-[#8B5CF6]/5 w-[15%]">BB Post</th>
                <th className="py-4 px-4 text-center text-sm font-medium text-white/40 w-[15%]">Buffer</th>
                <th className="py-4 px-4 text-center text-sm font-medium text-white/40 w-[15%]">Later</th>
                <th className="py-4 px-4 text-center text-sm font-medium text-white/40 w-[15%]">Postiz</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.feature} className={`border-b border-white/[0.05] last:border-0 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                  <td className="py-4 px-4 text-sm text-white/70">{row.feature}</td>
                  <Cell value={row.bbpost} highlight />
                  <Cell value={row.buffer} />
                  <Cell value={row.later} />
                  <Cell value={row.postiz} />
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <p className="mt-6 text-center text-white/40 text-sm">
          BB Post is the only open-source social scheduler with AI content, full automation, and a free plan — all in one product.
        </p>
      </div>
    </section>
  );
}
