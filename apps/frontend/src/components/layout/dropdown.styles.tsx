'use client';

import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { SVGLine } from '@gitroom/frontend/components/launches/launches.component';

// Shared look for every header dropdown (organization, theme, language) so
// they read as one system instead of one-off popovers - see the settings
// sidebar for the reference look this was lifted from: a subtle hover-tint
// surface plus the same purple edge indicator, not a solid brand-color fill.
export const dropdownPanelClass = (open: boolean, extra?: string) =>
  clsx(
    'z-[300] absolute top-[100%] end-0 translate-y-[10px] p-[8px] gap-[2px] bg-newBgColorInner shadow-menu rounded-[12px] border border-tableBorder flex-col animate-fadeIn text-newTextColor',
    open ? 'flex' : 'hidden',
    extra
  );

export const DropdownRow: FC<{
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}> = ({ selected, onClick, className, children }) => (
  <div
    onClick={onClick}
    className={clsx(
      'group flex items-center h-[40px] rounded-e-[8px] text-[14px] cursor-pointer whitespace-nowrap hover:bg-boxHover transition-colors',
      selected && 'bg-boxHover',
      className
    )}
  >
    <div
      className={clsx(
        'h-full w-[4px] shrink-0 rounded-s-[3px] opacity-0 group-hover:opacity-100 transition-opacity',
        selected && 'opacity-100'
      )}
    >
      <SVGLine />
    </div>
    <div className="flex items-center gap-[8px] ps-[8px] pe-[10px] flex-1 min-w-0">
      {children}
    </div>
  </div>
);
