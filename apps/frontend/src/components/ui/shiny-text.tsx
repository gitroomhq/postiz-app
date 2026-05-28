'use client';

import { createElement, type HTMLAttributes, type ElementType, type ReactNode } from 'react';
import clsx from 'clsx';

interface ShinyTextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  variant?: 'aurora' | 'shimmer';
  speed?: number;
  children?: ReactNode;
}

/**
 * ShinyText — solid yellow text. Anti-slop: NO gradient text per DESIGN.md.
 * Kept as a thin wrapper so existing imports keep working.
 *
 * Uses createElement instead of <Tag /> so the polymorphic `as` prop doesn't
 * trip TS's "children: never" inference on ElementType.
 */
export function ShinyText({
  as = 'span',
  className,
  children,
  variant: _variant,
  speed: _speed,
  ...rest
}: ShinyTextProps) {
  return createElement(
    as,
    { className: clsx('inline-block text-fg', className), ...rest },
    children,
  );
}
