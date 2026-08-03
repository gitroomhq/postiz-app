'use client';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{
  label: string;
  icon: ReactNode;
  path: string;
  collapsed?: boolean;
  onClick?: () => void;
}> = ({ label, icon, path, collapsed, onClick }) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

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
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </>
  );

  // Collapsed to icons, the label has to come back as a tooltip or the rail is
  // unreadable. `tooltip` is the single react-tooltip instance mounted by the
  // layout.
  const tip = collapsed
    ? { 'data-tooltip-id': 'tooltip', 'data-tooltip-content': label }
    : {};

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        className={className}
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
      {...tip}
    >
      {inner}
    </Link>
  );
};
