'use client';
import { FC, ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import Link from 'next/link';
import { useChromeLocation } from '@gitroom/frontend/components/layout/use-chrome-location';

export const MenuItem: FC<{
  label: string;
  icon: ReactNode;
  path: string;
  collapsed?: boolean;
  onClick?: () => void;
  /** Product-tour spotlight target (`data-tour`). */
  tourKey?: string;
}> = ({ label, icon, path, collapsed, onClick, tourKey }) => {
  // Soft Settings/Connections overlays must not steal the rail highlight from
  // the page still mounted under the scrim.
  const { pathname: currentPath, searchParams } = useChromeLocation();
  // Calendar/Posts share `/launches`; Settings More rows share `/settings?tab=`.
  // Pathname-only matching lights every More row whenever Settings is open.
  const isActive = useMemo(() => {
    const [base, query = ''] = path.split('?');
    if (!currentPath || currentPath.indexOf(base) !== 0) return false;
    if (base === '/launches') {
      const list = searchParams.get('display') === 'list';
      if (path.includes('display=list')) return list;
      return !list;
    }
    if (base === '/settings') {
      const pathTab = new URLSearchParams(query).get('tab');
      if (pathTab) {
        // More shortcut: only the matching settings tab.
        return searchParams.get('tab') === pathTab;
      }
      // Footer Settings gear: any /settings visit (hard load / no prior page).
      return true;
    }
    return currentPath.indexOf(base) === 0;
  }, [currentPath, path, searchParams]);

  // The rail is a neutral surface now, so states are brand tints rather than
  // tints of white. Hover is an inset ring laid over the row instead of a
  // background, and it is only applied when the row is not the current page —
  // otherwise you cannot tell which one you are on.
  const className = clsx(
    'group flex h-[34px] w-full items-center gap-[11px] rounded-pqSm px-[8px] text-start text-[13.5px] transition-colors',
    collapsed ? 'justify-center' : 'justify-start',
    isActive
      ? 'bg-pqNavActive font-[600] text-pqText'
      : 'font-[500] text-pqMuted hover:text-pqText hover:shadow-[inset_0_0_0_999px_var(--navRowHover)]'
  );

  const inner = (
    <>
      <span
        className={clsx(
          'shrink-0 transition-opacity',
          isActive ? 'opacity-100' : 'opacity-[0.65]'
        )}
      >
        {icon}
      </span>
      {/* Always in the DOM, hidden by CSS when the rail is collapsed. The
          collapsed rail expands on hover (see `[data-sb]` in global.scss) and a
          label React has not rendered cannot appear on hover. */}
      <span data-sbl="1" className="min-w-0 flex-1 truncate">
        {label}
      </span>
    </>
  );

  // No tooltip in the collapsed rail: hovering it widens the rail and shows the
  // real label, so a tooltip would put the same word on screen twice. `title`
  // still carries the name for anything that cannot hover.
  const tip = {};

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        className={className}
        {...(tourKey ? { 'data-tour': tourKey } : {})}
        {...tip}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      title={label}
      {...(path.indexOf('http') === 0 && { target: '_blank' })}
      className={className}
      {...(tourKey ? { 'data-tour': tourKey } : {})}
      {...tip}
    >
      {inner}
    </Link>
  );
};
