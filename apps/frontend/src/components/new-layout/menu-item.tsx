'use client';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{ label: ReactNode; icon: ReactNode; path: string; onClick?: () => void }> = ({
  label,
  icon,
  path,
  onClick,
}) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

  const className = clsx(
    'w-full minCustom:h-[56px] custom:h-[34px] py-[8px] px-[6px] gap-[4px] flex flex-col custom:flex-row text-[10px] font-[600] items-center minCustom:justify-center rounded-[14px] border transition-all duration-200',
    isActive
      ? 'text-textItemFocused bg-boxFocused border-sky-300/25 shadow-[0_12px_30px_rgba(56,189,248,0.14)]'
      : 'text-textItemBlur border-transparent hover:text-textItemFocused hover:bg-white/[0.04] hover:border-white/10'
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        <div className="custom:hidden">{icon}</div>
        <div className="text-[10px]">{label}</div>
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      {...path.indexOf('http') === 0 && { target: '_blank' }}
      className={className}
    >
      <div className="custom:hidden">{icon}</div>
      <div className="text-[10px]">{label}</div>
    </Link>
  );
};
