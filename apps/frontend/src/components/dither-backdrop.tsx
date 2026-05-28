'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Lazy-load the WebGL shader. Three.js + r3f is heavy — keep it out of the
// initial JS bundle and off the server render.
const Dither = dynamic(() => import('./Dither'), { ssr: false });

// Brand-purple-ish wave color, RGB in 0-1 floats. #7C3AED -> 124/255, 58/255, 237/255.
const PURPLE_WAVE_COLOR: [number, number, number] = [0.486, 0.227, 0.929];

/**
 * Full-page purple Dither shader pinned behind the page content. Pointer
 * interaction is disabled so the background never steals clicks from the
 * actual UI sitting on top.
 *
 * Skips entirely when the user prefers reduced motion — the shader animates
 * continuously and shouldn't run in that mode.
 */
export function DitherBackdrop() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 opacity-40 md:opacity-60"
    >
      <Dither
        waveColor={PURPLE_WAVE_COLOR}
        waveSpeed={0.04}
        waveFrequency={3}
        waveAmplitude={0.3}
        colorNum={4}
        pixelSize={2}
        enableMouseInteraction={false}
        mouseRadius={1}
      />
    </div>
  );
}
