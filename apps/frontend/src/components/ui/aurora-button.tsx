'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

type AuroraButtonVariant = 'cta' | 'primary' | 'ghost' | 'destructive';
type AuroraButtonSize = 'sm' | 'md' | 'lg';

interface AuroraButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AuroraButtonVariant;
  size?: AuroraButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

// Linear-flat: solid yellow CTA, subtle brightness shift on hover, no glow
const variantClasses: Record<AuroraButtonVariant, string> = {
  cta: clsx(
    'bg-brand-500 text-brand-darker font-semibold',
    'hover:bg-brand-300 hover:-translate-y-px',
    'active:translate-y-0',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
  ),
  primary: clsx(
    'bg-customColor1 text-fg border border-borderGlassStrong',
    'hover:border-brand-500 hover:bg-customColor35',
    'active:translate-y-0',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ),
  ghost: clsx(
    'bg-transparent text-fgMuted border border-borderGlass',
    'hover:text-fg hover:border-borderGlassStrong hover:bg-customColor16',
    'active:translate-y-0',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ),
  destructive: clsx(
    'bg-customColor19 text-brand-100 border border-customColor22',
    'hover:bg-customColor22 hover:text-fg',
    'active:translate-y-0',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ),
};

const sizeClasses: Record<AuroraButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[13px] rounded-md gap-1.5 h-8',
  md: 'px-4 py-2 text-sm rounded-md gap-2 h-9',
  lg: 'px-5 py-2.5 text-[15px] rounded-lg gap-2 h-11',
};

export const AuroraButton = forwardRef<HTMLButtonElement, AuroraButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading,
      icon,
      iconPosition = 'left',
      className,
      children,
      disabled,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium',
        'transition-[background-color,border-color,transform,opacity] duration-180 ease-out',
        'focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-spin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
          <path
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  )
);

AuroraButton.displayName = 'AuroraButton';
