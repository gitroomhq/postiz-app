import * as React from 'react';
import { cn } from '@gitroom/frontend/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium text-label whitespace-nowrap select-none ' +
  'transition-colors duration-150 ease-out ' +
  'focus-visible:outline-none focus-visible:shadow-focusRing ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-aurora-cta text-brand-darker hover:bg-aurora-ctaHover',
  secondary:
    'glass-elevated text-fg hover:bg-white/[0.06]',
  ghost:
    'bg-transparent text-fgMuted hover:text-fg hover:bg-white/[0.04]',
  outline:
    'border border-borderGlassStrong text-fg hover:bg-white/[0.04]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-caption',
  md: 'h-10 px-4',
  lg: 'h-11 px-5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(base, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
