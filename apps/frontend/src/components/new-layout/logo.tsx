'use client';

import Link from 'next/link';
import clsx from 'clsx';
import {
  appVersionLabel,
  CrownGlyph,
  PostQueenLogo,
} from '@gitroom/frontend/components/ui/logo.component';

/**
 * Brand mark for the app chrome, in two variants because it sits on two very
 * different surfaces:
 *
 *   'tile'   — the purple tile, on a neutral surface (the OAuth consent screen,
 *              the billing screen).
 *   'header' — the header's leftmost cell: a 30px tile plus the wordmark, sized
 *              to the rail so the hairline under the cell continues the rail's
 *              own edge. Collapsing the rail collapses this cell with it, which
 *              is why the label hides rather than the whole lockup.
 *
 * It used to print the deployment's hostname under the mark. At 9px in a 64px
 * column that was a cramped URL rather than a tagline, and the host is already
 * in the address bar.
 *
 * Links to the Calendar either way, so the crown doubles as "home".
 */
export const Logo = ({
  variant = 'tile',
  collapsed,
}: {
  variant?: 'tile' | 'header';
  collapsed?: boolean;
}) => (
  <Link
    href="/launches"
    aria-label="Calendar"
    className={clsx(
      variant === 'header'
        ? 'flex h-full items-center gap-[9px] overflow-hidden'
        : 'flex items-center justify-center transition-transform duration-200 hover:scale-105',
      variant === 'header' && (collapsed ? 'justify-center' : 'justify-start')
    )}
  >
    {variant === 'header' ? (
      <>
        <span className="grid size-[30px] shrink-0 place-items-center rounded-[9px] bg-pqBrand">
          <CrownGlyph className="size-[18px] text-white" />
        </span>
        {!collapsed && (
          <span className="flex min-w-0 items-baseline gap-[6px]">
            <span className="truncate font-display text-[16.5px] font-[700] -tracking-[0.3px] text-pqText">
              PostQueen
            </span>
            <span className="shrink-0 text-[10.5px] font-[600] tabular-nums text-pqSoft">
              {appVersionLabel}
            </span>
          </span>
        )}
      </>
    ) : (
      <PostQueenLogo tileClassName="size-10" />
    )}
  </Link>
);
