import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm transition-colors placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
              icon && 'pl-10',
              error
                ? 'border-status-failed focus:border-status-failed focus:ring-status-failed/20'
                : 'border-gray-300',
              className
            )}
            {...props}
          />
        </div>
        {hint && !error && (
          <p className="mt-1 text-xs text-text-muted">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-status-failed">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
