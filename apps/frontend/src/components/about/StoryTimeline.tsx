'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { GlassCard } from '@gitroom/frontend/components/ui/glass-card';

interface Milestone {
  year: string;
  title: string;
  body: string;
}

// Placeholder milestones — swap with the real D3 history when available.
const MILESTONES: Milestone[] = [
  {
    year: '2021',
    title: 'D3 founded in Malaysia',
    body: 'Started as a content production studio focused on turning attention into business — not vanity, not motivation.',
  },
  {
    year: '2022',
    title: 'First creator hits 100K followers',
    body: 'Proof the system works. The first of many — and the moment we started counting outcomes, not impressions.',
  },
  {
    year: '2023',
    title: 'Multi-platform expansion',
    body: 'Operations expand to TikTok, Instagram, Facebook, Douyin, and Xiaohongshu. Five platforms, one playbook.',
  },
  {
    year: '2024',
    title: '50+ creators in the ecosystem',
    body: 'The studio crosses fifty active creators, all measured against real outcomes: leads, sales, brand value.',
  },
  {
    year: '2026',
    title: 'D3 Creator goes public',
    body: 'Live leaderboard launches. Every number visible, nothing hidden. The thesis on display.',
  },
];

export function StoryTimeline() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="about-timeline-heading"
      className="w-full pb-20 sm:pb-28 max-w-[1100px] mx-auto"
    >
      <header className="mb-12 max-w-[760px]">
        <p className="text-micro uppercase text-fgSubtle tracking-[0.35em] mb-3">
          Since 2021
        </p>
        <h2
          id="about-timeline-heading"
          className="text-display-2 text-fg tracking-[-0.03em] leading-[1.08]"
        >
          Five years of building creators that actually{' '}
          <span className="text-brand">generate business</span>.
        </h2>
        <p className="text-body-lg text-fgMuted mt-6">
          Not influencer vanity. Not motivational decks. A short, real history
          of an operating company that turns short-video attention into leads,
          sales, and long-term brand value.
        </p>
      </header>

      <div className="relative mx-auto max-w-[820px]">
        {/* Vertical guide line */}
        <div
          aria-hidden="true"
          className="absolute left-[7px] sm:left-[11px] top-2 bottom-2 w-px bg-borderGlass"
        />

        <ol className="space-y-10 sm:space-y-12">
          {MILESTONES.map((milestone, index) => (
            <motion.li
              key={milestone.year + milestone.title}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -10% 0px' }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative pl-10 sm:pl-14"
            >
              {/* Dot on the line */}
              <span
                aria-hidden="true"
                className="absolute left-0 top-[10px] flex h-4 w-4 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-canvas ring-1 ring-borderGlass"
              >
                <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-brand-500" />
              </span>

              <p className="font-mono text-caption text-fgSubtle uppercase tracking-[0.2em] mb-2 tabular-nums">
                {milestone.year}
              </p>
              <GlassCard
                variant="base"
                padding="lg"
                radius="2xl"
                className="flex flex-col gap-2"
              >
                <h3 className="text-subsection text-fg tracking-[-0.015em]">
                  {milestone.title}
                </h3>
                <p className="text-body text-fgMuted leading-relaxed">
                  {milestone.body}
                </p>
              </GlassCard>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
