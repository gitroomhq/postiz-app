'use client';

import { type ReactNode } from 'react';
import clsx from 'clsx';
import { useInView } from './use-in-view';

interface RevealProps {
  children: ReactNode;
  /** Stagger delay in ms (default 0) */
  delay?: number;
  className?: string;
}

/**
 * Single-fire fade + rise on scroll-into-view. Linear-flat motion:
 * opacity 0→1, translateY 8px→0, 200ms ease-out. Honors prefers-reduced-motion.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-in-view={inView}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={clsx(
        'opacity-0 translate-y-2',
        'data-[in-view=true]:opacity-100 data-[in-view=true]:translate-y-0',
        'transition-[opacity,transform] duration-200 ease-out',
        'motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:opacity-100',
        className
      )}
    >
      {children}
    </div>
  );
}
