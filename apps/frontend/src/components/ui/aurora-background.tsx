'use client';

import { type HTMLAttributes } from 'react';
import clsx from 'clsx';

interface AuroraBackgroundProps extends HTMLAttributes<HTMLDivElement> {
  intensity?: 'subtle' | 'medium' | 'strong';
  animated?: boolean;
  noVignette?: boolean;
}

/**
 * Linear-flat hero surface. No aurora canvas, no radial glows.
 * Single-axis top-to-bottom yellow fade over solid dark canvas.
 * Anti-slop: no animation, no multi-hue. Yellow tokens only.
 */
const intensityClasses = {
  subtle: 'opacity-40',
  medium: 'opacity-60',
  strong: 'opacity-100',
} as const;

export function AuroraBackground({
  intensity = 'medium',
  className,
  children,
  ...rest
}: AuroraBackgroundProps) {
  return (
    <div
      className={clsx('relative isolate overflow-hidden bg-canvas', className)}
      {...rest}
    >
      <div
        aria-hidden="true"
        className={clsx(
          'pointer-events-none absolute inset-0 bg-brandFade',
          intensityClasses[intensity]
        )}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
