'use client';

import Link from 'next/link';
import {
  CrownGlyph,
  PostQueenLogo,
} from '@gitroom/frontend/components/ui/logo.component';

/**
 * Brand mark for the app chrome, in two variants because it sits on two very
 * different surfaces:
 *
 *   'tile' — the purple tile, on a neutral surface (the OAuth consent screen,
 *            the billing screen).
 *   'rail' — the crown alone, in white, on the branded left rail. A purple
 *            tile on a purple rail reads as a smudge, so the tile comes off
 *            and the mark sits directly on the gradient.
 *
 * It used to print the deployment's hostname under the mark. At 9px in a 64px
 * column that was a cramped URL rather than a tagline, and the host is already
 * in the address bar.
 *
 * Links to the Calendar either way, so the crown doubles as "home".
 */
export const Logo = ({ variant = 'tile' }: { variant?: 'tile' | 'rail' }) => (
  <Link
    href="/launches"
    aria-label="Calendar"
    className="flex items-center justify-center transition-transform duration-200 hover:scale-105"
  >
    {variant === 'rail' ? (
      <CrownGlyph className="size-[30px] text-white" />
    ) : (
      <PostQueenLogo tileClassName="size-10" />
    )}
  </Link>
);
