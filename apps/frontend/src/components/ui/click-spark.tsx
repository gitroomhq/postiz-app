'use client';

import { type ReactNode } from 'react';

interface ClickSparkProps {
  color?: string;
  count?: number;
  distance?: number;
  duration?: number;
  children: ReactNode;
}

/**
 * Anti-slop: no particle bursts. Pass-through wrapper.
 * Kept so existing imports do not break.
 */
export function ClickSpark({ children }: ClickSparkProps) {
  return <span className="relative inline-block">{children}</span>;
}
