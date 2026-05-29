/**
 * EmptyState — a structured zero-data / first-run surface.
 *
 * Replaces the bare "one line of fgMuted text in a glass box" empties across
 * the creator dashboard. Pure server component (no client JS): an optional
 * icon tile, a title, a description, optional extra content (e.g. a row of
 * platform icons), and up to two call-to-action links.
 *
 * `size="lg"` is the centerpiece treatment for the highest-intent moments
 * (e.g. a creator with no profiles yet); `size="sm"` is a compact inline
 * empty for secondary sections.
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

interface EmptyStateAction {
  href: string;
  label: string;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: EmptyStateAction;
  secondary?: EmptyStateAction;
  /** Extra content rendered between the description and the actions. */
  children?: ReactNode;
  size?: 'sm' | 'lg';
}

const primaryCta =
  'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md font-medium text-label ' +
  'bg-aurora-cta text-brand-darker hover:bg-aurora-ctaHover transition-colors duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:shadow-focusRing';

const secondaryCta =
  'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-label text-fg ' +
  'border border-borderGlassStrong hover:bg-white/[0.04] transition-colors duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:shadow-focusRing';

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  children,
  size = 'lg',
}: EmptyStateProps) {
  const lg = size === 'lg';
  return (
    <div
      className={`glass-subtle border border-borderGlass rounded-2xl flex flex-col items-center text-center ${
        lg ? 'px-6 py-14 gap-4' : 'px-6 py-8 gap-3'
      }`}
    >
      {icon && (
        <div
          className={`flex items-center justify-center rounded-2xl glass-base border border-borderGlass text-fgMuted shrink-0 ${
            lg ? 'size-14' : 'size-11'
          }`}
        >
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1.5 max-w-[44ch]">
        <h3 className={lg ? 'text-heading text-fg' : 'text-body font-medium text-fg'}>
          {title}
        </h3>
        {description && <p className="text-body text-fgMuted">{description}</p>}
      </div>
      {children}
      {(action || secondary) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
          {action && (
            <Link href={action.href} className={primaryCta}>
              {action.label}
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className={secondaryCta}>
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
