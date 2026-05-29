'use client';

/**
 * MobileNav — hamburger disclosure for the public header on small viewports.
 *
 * The header is a Server Component, so this client island owns the open/close
 * state. Renders a 44px hamburger that toggles a full-width panel below the
 * 56px header. Closes on link click, Escape, and outside click. Active route
 * gets the brand-yellow treatment (same rule as NavLink).
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@gitroom/frontend/lib/utils';

interface MobileNavLink {
  href: string;
  label: string;
  exact?: boolean;
}

export default function MobileNav({ links }: { links: MobileNavLink[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-11 items-center justify-center rounded-md text-fg hover:bg-white/[0.04] transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-14 z-50 border-b border-borderGlass bg-canvas">
          <nav className="max-w-[1200px] mx-auto px-6 py-2 flex flex-col">
            {links.map((l) => {
              const isActive = l.exact
                ? pathname === l.href
                : pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center h-12 border-b border-white/[0.06] last:border-b-0 text-label transition-colors',
                    isActive ? 'text-aurora-cta font-medium' : 'text-fg hover:text-aurora-cta',
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
