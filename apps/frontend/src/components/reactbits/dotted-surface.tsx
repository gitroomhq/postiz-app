'use client';

import dynamic from 'next/dynamic';
import { type ReactNode } from 'react';
import { cn } from '@gitroom/frontend/lib/utils';

// Three.js bundle is heavy — only load on the client and skip SSR.
const DottedSurfaceCanvas = dynamic(
  () => import('./dotted-surface-canvas').then((m) => m.DottedSurfaceCanvas),
  { ssr: false },
);

interface DottedSurfaceProps {
  children: ReactNode;
  className?: string;
}

/**
 * Animated Dotted Surface — a 3D plane of dots animated with sine waves,
 * adapted from 21st.dev. Contained within its parent (not fixed viewport),
 * responsive via ResizeObserver, and skips the animation loop when the
 * user prefers reduced motion.
 */
export function DottedSurface({ children, className }: DottedSurfaceProps) {
  return (
    <div
      className={cn(
        'relative isolate w-full overflow-hidden bg-canvas',
        className,
      )}
    >
      <DottedSurfaceCanvas />

      {/* Soft radial vignette so the dot field calms toward the edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 30%, rgba(10,10,13,0.85) 100%)',
        }}
      />

      <div className="relative z-0">{children}</div>
    </div>
  );
}
