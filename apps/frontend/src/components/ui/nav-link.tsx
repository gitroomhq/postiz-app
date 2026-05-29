'use client';

/**
 * NavLink — nav item with active-route awareness.
 *
 * Active route gets the brand-yellow treatment DESIGN.md §1/§4 reserves for it
 * ("Active link: color #F2E600"); inactive stays neutral. Active when the path
 * matches exactly, or (for non-root hrefs) when the current path is nested
 * under it — so /me/profiles/x still lights "Profiles".
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@gitroom/frontend/lib/utils';

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** Match only the exact path (use on index routes like /me, /admin, /). */
  exact?: boolean;
}

export default function NavLink({ href, children, className, exact = false }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'px-3 py-1.5 rounded-md transition-colors duration-150',
        isActive
          ? 'text-aurora-cta font-medium'
          : 'text-fgMuted hover:text-fg hover:bg-white/[0.04]',
        className,
      )}
    >
      {children}
    </Link>
  );
}
