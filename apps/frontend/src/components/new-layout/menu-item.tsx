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

  const wrapperClassName = clsx(
    'nav-item relative',
    isActive && 'active'
  );

  const linkClassName = clsx(
    'block h-[44px] px-[14px] overflow-hidden rounded-[14px] relative transition-colors duration-200',
    !isActive && 'hover:bg-boxFocused/30'
  );

  const content = (
    <div className="nav-slide-content h-full w-full transition-transform duration-500 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)]">
      <span className={clsx(
        'flex justify-center items-center gap-[8px] h-[44px] w-full text-[16px] font-[500] whitespace-nowrap',
        isActive ? 'text-textItemFocused' : 'text-textItemBlur'
      )}>
        <span className="flex items-center justify-center w-[24px] h-[24px] [&>svg]:w-[24px] [&>svg]:h-[24px]">{icon}</span>
        {label}
      </span>
      <span className={clsx(
        'flex justify-center items-center h-[44px] w-full',
        isActive ? 'text-textItemFocused' : 'text-textItemBlur'
      )}>
        <span className="flex items-center justify-center w-[24px] h-[24px] [&>svg]:w-[24px] [&>svg]:h-[24px]">{icon}</span>
      </span>
    </div>
  );

  if (onClick) {
    return (
      <div className={wrapperClassName}>
        <button onClick={onClick} className={linkClassName}>
          {content}
        </button>
        <div className={clsx(
          'nav-indicator absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-[20px] h-[3px] rounded-full transition-transform duration-400',
          isActive ? 'scale-x-100 bg-[#c15f3c] shadow-[0_0_10px_rgba(193,95,60,0.6)]' : 'scale-x-0'
        )} />
      </div>
    );
  }

  return (
    <div className={wrapperClassName}>
      <Link
        prefetch={true}
        href={path}
        {...(path.indexOf('http') === 0 ? { target: '_blank' } : {})}
        className={linkClassName}
      >
        {content}
      </Link>
      <div className={clsx(
        'nav-indicator absolute bottom-[-2px] left-1/2 -translate-x-1/2 w-[20px] h-[3px] rounded-full transition-transform duration-400',
        isActive ? 'scale-x-100 bg-[#c15f3c] shadow-[0_0_10px_rgba(193,95,60,0.6)]' : 'scale-x-0'
      )} />
    </div>
  );
};
