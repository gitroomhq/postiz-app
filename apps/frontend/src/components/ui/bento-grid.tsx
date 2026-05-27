'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

type BentoSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface BentoGridProps extends HTMLAttributes<HTMLDivElement> {
  gap?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

interface BentoItemProps extends HTMLAttributes<HTMLDivElement> {
  /** Column span at desktop (12-col grid) */
  colSpan?: BentoSpan;
  /** Row span at desktop */
  rowSpan?: 1 | 2 | 3;
  /** Override mobile column span (defaults to full width = 1 col on mobile grid) */
  mobileColSpan?: BentoSpan;
  /** Override tablet column span (6-col grid) */
  tabletColSpan?: BentoSpan;
  children?: ReactNode;
}

const colSpanMap: Record<BentoSpan, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  10: 'lg:col-span-10',
  11: 'lg:col-span-11',
  12: 'lg:col-span-12',
};

const rowSpanMap = {
  1: 'lg:row-span-1',
  2: 'lg:row-span-2',
  3: 'lg:row-span-3',
} as const;

const tabletColSpanMap: Record<BentoSpan, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-6',
  8: 'md:col-span-6',
  9: 'md:col-span-6',
  10: 'md:col-span-6',
  11: 'md:col-span-6',
  12: 'md:col-span-6',
};

const gapMap = {
  sm: 'gap-3 sm:gap-4',
  md: 'gap-4 sm:gap-5 lg:gap-6',
  lg: 'gap-5 sm:gap-6 lg:gap-8',
} as const;

export const BentoGrid = forwardRef<HTMLDivElement, BentoGridProps>(
  ({ gap = 'md', className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 auto-rows-bento',
        gapMap[gap],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);

BentoGrid.displayName = 'BentoGrid';

export const BentoItem = forwardRef<HTMLDivElement, BentoItemProps>(
  (
    {
      colSpan = 4,
      rowSpan = 1,
      tabletColSpan,
      mobileColSpan,
      className,
      children,
      ...rest
    },
    ref
  ) => (
    <div
      ref={ref}
      className={clsx(
        'col-span-1',
        tabletColSpan ? tabletColSpanMap[tabletColSpan] : tabletColSpanMap[Math.min(colSpan, 6) as BentoSpan],
        colSpanMap[colSpan],
        rowSpanMap[rowSpan],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
);

BentoItem.displayName = 'BentoItem';
