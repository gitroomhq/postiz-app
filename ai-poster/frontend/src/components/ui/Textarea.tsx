import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  showCount?: boolean;
  maxChars?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, showCount, maxChars, className, id, value, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const charCount = typeof value === 'string' ? value.length : 0;
    const isOverLimit = maxChars ? charCount > maxChars : false;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          className={cn(
            'block w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm transition-colors placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            error || isOverLimit
              ? 'border-status-failed focus:border-status-failed focus:ring-status-failed/20'
              : 'border-gray-300',
            className
          )}
          {...props}
        />
        <div className="mt-1 flex items-center justify-between">
          <div>
            {hint && !error && (
              <p className="text-xs text-text-muted">{hint}</p>
            )}
            {error && (
              <p className="text-xs text-status-failed">{error}</p>
            )}
          </div>
          {showCount && (
            <p
              className={cn(
                'text-xs',
                isOverLimit ? 'text-status-failed font-medium' : 'text-text-muted'
              )}
            >
              {charCount}
              {maxChars ? ` / ${maxChars}` : ''}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
