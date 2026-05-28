import * as React from 'react';
import { cn } from '@gitroom/frontend/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md bg-glass-subtle border border-borderGlass px-3 text-body text-fg',
        'placeholder:text-fgSubtle',
        'transition-colors duration-150 ease-out',
        'focus-visible:outline-none focus-visible:border-aurora-cta focus-visible:shadow-focusRing',
        'disabled:opacity-50 disabled:pointer-events-none',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
