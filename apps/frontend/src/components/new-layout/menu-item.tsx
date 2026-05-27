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
}> = ({ label, icon, path, onClick }) => {
  const currentPath = usePathname();
  const isActive = currentPath.indexOf(path) === 0;

  const className = clsx(
    'group relative w-full minCustom:h-[54px] custom:h-[30px] py-2 px-1.5 gap-1 flex flex-col custom:flex-row text-[10px] font-medium items-center minCustom:justify-center tracking-[0.04em] uppercase rounded-md transition-[background-color,color] duration-180 ease-out',
    isActive
      ? 'text-fg bg-customColor16 border-s-2 border-brand-500'
      : 'text-fgMuted hover:text-fg hover:bg-customColor16'
  );

  // Flat brand dot indicator on active state — no glow
  const activeAccent = isActive && (
    <span
      aria-hidden="true"
      className="absolute -end-0.5 top-1/2 -translate-y-1/2 size-1 rounded-full bg-brand-500"
    />
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        <div className="custom:hidden">{icon}</div>
        <div className="text-[10px]">{label}</div>
        {activeAccent}
      </button>
    );
  }

  return (
    <Link
      prefetch={true}
      href={path}
      {...(path.indexOf('http') === 0 && { target: '_blank' })}
      className={className}
    >
      <div className="custom:hidden">{icon}</div>
      <div className="text-[10px]">{label}</div>
      {activeAccent}
    </Link>
  );
};
