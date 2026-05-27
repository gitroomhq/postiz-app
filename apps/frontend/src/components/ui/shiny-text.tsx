'use client';

import { type HTMLAttributes, type ElementType, type ReactNode } from 'react';
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
 */
export function ShinyText({
  as: Tag = 'span',
  className,
  children,
  ...rest
}: ShinyTextProps) {
  return (
    <Tag
      className={clsx('inline-block text-fg', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
