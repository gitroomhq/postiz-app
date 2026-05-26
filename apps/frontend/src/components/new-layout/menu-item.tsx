'use client';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export const MenuItem: FC<{ label: string; icon: ReactNode; path: string; onClick?: () => void }> = ({
  label,
  icon,
  path,
  onClick,
}) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

  const className = clsx(
    'relative w-full minCustom:h-[54px] custom:h-[30px] py-[8px] px-[6px] gap-[4px] flex flex-col custom:flex-row text-[10px] font-[400] items-center minCustom:justify-center uppercase tracking-[0.14px] border-l-2 transition-colors hover:text-lamboGold hover:bg-lamboIron',
    isActive
      ? 'text-lamboGold bg-lamboIron border-lamboGold'
      : 'text-lamboAsh border-transparent'
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
