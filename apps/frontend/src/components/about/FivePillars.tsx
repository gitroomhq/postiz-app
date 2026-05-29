'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@gitroom/frontend/lib/utils';

interface Pillar {
  title: string;
  body: string;
  meta: string;
  span: string;
}

// Asymmetric 6-col bento: one tall feature card + four wide rows.
const PILLARS: Pillar[] = [
  {
    title: 'Real content production',
    body: 'Hooks, structure, story, format — every video built like a piece of inventory.',
    meta: 'Production',
    span: 'md:col-span-4 md:row-span-2',
  },
  {
    title: 'Real audience growth',
    body: 'Compounding follower curves, not vanity spike-and-fade.',
    meta: 'Growth',
    span: 'md:col-span-2 md:row-span-1',
  },
  {
    title: 'Real platform understanding',
    body: 'Five platforms, five different physics. We operate them — not just post.',
    meta: 'Platforms',
    span: 'md:col-span-2 md:row-span-1',
  },
  {
    title: 'Real business positioning',
    body: 'Niche, voice, offer — engineered so attention converts.',
    meta: 'Positioning',
    span: 'md:col-span-3 md:row-span-1',
  },
  {
    title: 'Real monetization',
    body: 'Leads, sales, partnerships, brand deals. Measured outcomes, not impressions.',
    meta: 'Revenue',
    span: 'md:col-span-3 md:row-span-1',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export function FivePillars() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="about-pillars-heading"
      className="w-full pb-20 sm:pb-28 max-w-[1100px] mx-auto px-6 md:px-8"
    >
      <header className="mb-10 flex flex-col gap-6 border-b border-borderGlass pb-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-micro uppercase text-fgSubtle tracking-[0.35em]">
            Five pillars
          </span>
          <h2
            id="about-pillars-heading"
            className="text-section text-fg max-w-[640px] tracking-[-0.025em]"
          >
            Everything D3 is built around{' '}
            <span className="text-brand">real execution</span>.
          </h2>
        </div>
        <p className="max-w-sm text-body-sm text-fgMuted md:text-right">
          Our system focuses on measurable outcomes. No vanity metrics, no
          motivational decks.
        </p>
      </header>

      <motion.div
        variants={reducedMotion ? undefined : containerVariants}
        initial={reducedMotion ? false : 'hidden'}
        whileInView={reducedMotion ? undefined : 'visible'}
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        className="grid grid-cols-1 gap-3 md:auto-rows-[minmax(140px,auto)] md:grid-cols-6"
      >
        {PILLARS.map((pillar) => (
          <motion.article
            key={pillar.title}
            variants={reducedMotion ? undefined : itemVariants}
            className={cn(
              'group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl',
              'border border-borderGlass bg-customColor1 p-6',
              'transition-[transform,border-color,background-color] duration-200 ease-out',
              'hover:-translate-y-0.5 hover:border-borderGlassStrong hover:bg-customColor35',
              pillar.span,
            )}
          >
            {/* Soft brand wash, top-left */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(ellipse 60% 120% at 12% 0%, rgba(242,230,0,0.10), transparent 72%)',
              }}
            />

            <header className="flex items-start gap-3">
              <h3 className="text-subsection text-fg tracking-[-0.015em] flex-1">
                {pillar.title}
              </h3>
              <span className="ml-auto rounded-full border border-borderGlass px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-fgSubtle">
                {pillar.meta}
              </span>
            </header>
            <p className="mt-3 text-body-sm leading-relaxed text-fgMuted">
              {pillar.body}
            </p>
          </motion.article>
        ))}
      </motion.div>

      <p className="text-caption text-fgSubtle uppercase tracking-[0.2em] mt-12 border-t border-borderGlass pt-6">
        Quiet precision for outcomes that compound.
      </p>
    </section>
  );
}
