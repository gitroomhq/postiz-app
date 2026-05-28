'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { type ReactNode } from 'react';
import { cn } from '@gitroom/frontend/lib/utils';

interface ShapeProps {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}

/**
 * Adapted from 21st.dev's Shape Landing Hero. Single floating elongated shape
 * with a soft tonal yellow gradient — strictly inside D3's brand palette
 * (no foreign hues from the original indigo/rose/violet/amber/cyan source).
 */
function FloatingShape({
  className,
  delay = 0,
  width = 600,
  height = 140,
  rotate = 0,
  gradient = 'from-brand-500/[0.18]',
}: ShapeProps) {
  const reducedMotion = useReducedMotion();

  const initial = reducedMotion
    ? { opacity: 0.6, y: 0, rotate }
    : { opacity: 0, y: -150, rotate: rotate - 15 };
  const animate = { opacity: 1, y: 0, rotate };
  const transition = reducedMotion
    ? { duration: 0 }
    : {
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96] as const,
        opacity: { duration: 1.2 },
      };

  const float = reducedMotion
    ? undefined
    : {
        y: [0, 15, 0],
      };
  const floatTransition = reducedMotion
    ? undefined
    : { duration: 12, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <motion.div
      aria-hidden="true"
      initial={initial}
      animate={animate}
      transition={transition}
      className={cn('absolute', className)}
    >
      <motion.div
        animate={float}
        transition={floatTransition}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'bg-gradient-to-r to-transparent',
            gradient,
            'border border-white/[0.10]',
            'after:absolute after:inset-0 after:rounded-full',
            'after:bg-[radial-gradient(circle_at_50%_50%,rgba(242,230,0,0.12),transparent_70%)]',
          )}
        />
      </motion.div>
    </motion.div>
  );
}

interface FloatingShapesHeroProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps hero content with a layer of soft, drifting yellow-tinted shapes.
 * Compositor-friendly (transform + opacity only). Honors prefers-reduced-motion.
 */
export function FloatingShapesHero({ children, className }: FloatingShapesHeroProps) {
  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-canvas',
        className,
      )}
    >
      {/* Soft vertical brand fade behind shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-500/[0.06] via-transparent to-transparent"
      />

      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <FloatingShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-brand-500/[0.18]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />
        <FloatingShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-brand-400/[0.16]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />
        <FloatingShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-brand-700/[0.16]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />
        <FloatingShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-brand-200/[0.10]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />
        <FloatingShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-brand-300/[0.10]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
        />
      </div>

      <div className="relative z-10">{children}</div>

      {/* Bottom fade so the hero blends into the rest of the dark canvas */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-canvas to-transparent"
      />
    </div>
  );
}
