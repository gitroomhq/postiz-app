'use client';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{
  label: string;
  icon: ReactNode;
  path: string;
  onClick?: () => void;
  onNavigate?: () => void;
  variant?: 'sidebar' | 'drawer';
}> = ({ label, icon, path, onClick, onNavigate, variant = 'sidebar' }) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

  const className = clsx(
    'group w-full font-[600] rounded-[12px] hover:text-textItemFocused hover:bg-boxFocused transition-colors',
    variant === 'sidebar'
      ? 'minCustom:h-[54px] custom:h-[44px] py-[8px] px-[6px] minCustom:gap-[4px] custom:gap-[2px] flex flex-col items-center justify-center'
      : 'min-h-[48px] px-[12px] py-[10px] flex items-center justify-start gap-[12px] text-[14px]',
    isActive ? 'text-textItemFocused bg-boxFocused' : 'text-textItemBlur',
  );

  const inner = (
    <>
      <div
        className={clsx(
          'shrink-0 transition-transform',
          variant === 'sidebar' && 'custom:scale-90',
        )}
      >
        {icon}
      </div>
      <div
        className={clsx(
          'min-w-0 leading-[1.1]',
          variant === 'sidebar'
            ? 'custom:text-[9px] minCustom:text-[10px] text-center'
            : 'truncate text-left',
        )}
      >
        {label}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => {
          onClick();
          onNavigate?.();
        }}
        title={label}
        className={className}
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
      onClick={onNavigate}
    >
      {inner}
    </Link>
  );
};
