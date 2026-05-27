'use client';

import { Children, type HTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

interface AnimatedListProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** ms between each item's entry — capped at 40ms (anti-slop) */
  stagger?: number;
  /** initial offset in px — capped at 8 */
  offset?: number;
  /** Direction children enter from */
  direction?: 'up' | 'down' | 'left' | 'right';
  children?: ReactNode;
}

/**
 * AnimatedList — stagger-fades children in with ease-out tween.
 * Anti-slop: NO spring physics, 180ms ease-out only, stagger capped at 40ms,
 * offset capped at 8px (opacity + transform only).
 */
export function AnimatedList({
  stagger = 40,
  offset = 8,
  direction = 'up',
  className,
  children,
  ...rest
}: AnimatedListProps) {
  const reducedMotion = useReducedMotion();
  const items = Children.toArray(children);

  if (reducedMotion) {
    return (
      <div className={className} {...rest}>
        {items}
      </div>
    );
  }

  const cappedStagger = Math.min(stagger, 40);
  const cappedOffset = Math.min(offset, 8);

  const initial = {
    up: { y: cappedOffset, x: 0 },
    down: { y: -cappedOffset, x: 0 },
    left: { x: cappedOffset, y: 0 },
    right: { x: -cappedOffset, y: 0 },
  }[direction];

  return (
    <div className={clsx(className)} {...rest}>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, ...initial }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{
            duration: 0.18,
            ease: [0, 0, 0.2, 1],
            delay: (i * cappedStagger) / 1000,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
