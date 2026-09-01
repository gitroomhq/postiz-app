'use client';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';

export const MenuItem: FC<{ label: string; icon: ReactNode; path: string; onClick?: () => void }> = ({
  label,
  icon,
  path,
  onClick,
}) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

  // Same "selected" treatment as the settings sidebar - a hover-tint
  // surface plus the purple edge indicator - adapted to this rail's
  // vertical icon+label tiles instead of horizontal label rows.
  const className = clsx(
    'group w-full min-w-0 minCustom:h-[54px] custom:h-[44px] flex items-center rounded-e-[12px] hover:bg-boxHover transition-colors',
    isActive && 'bg-boxHover'
  );

  const inner = (
    <>
      <div
        className={clsx(
          'h-full w-[4px] shrink-0 rounded-s-[3px] opacity-0 group-hover:opacity-100 transition-opacity',
          isActive && 'opacity-100'
        )}
      >
        <SVGLine />
      </div>
      <div className="flex-1 flex flex-col font-[600] items-center justify-center py-[8px] px-[6px] minCustom:gap-[4px] custom:gap-[2px] min-w-0">
        <div className="custom:scale-90 transition-transform">{icon}</div>
        <div className="custom:text-[9px] minCustom:text-[10px] leading-[1.1] text-center">
          {label}
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} title={label} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      title={label}
      {...path.indexOf('http') === 0 && { target: '_blank' }}
      className={className}
    >
      {inner}
    </Link>
  );
};
