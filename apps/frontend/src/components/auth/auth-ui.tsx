'use client';

/**
 * Primitivos de UI exclusivos das telas de auth (login/register/forgot).
 *
 * Decisão de escopo: NÃO editamos libraries/react-shared-libraries/src/form/{button,input}.tsx
 * porque esse Button/Input é usado em telas herdadas do Postiz (media, analytics,
 * admin-stats, launches) que continuam no design antigo por enquanto. Criamos uma
 * variante local para não alterar comportamento visual fora do fluxo de auth.
 *
 * Segue docs/handoff-novo-design/vocaccio-system-design-final.md: gradiente aurora,
 * radius-pill, glass, tokens --voc-*.
 */

import {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  FC,
  InputHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';
import { useFormContext } from 'react-hook-form';

const Spinner: FC<{ size?: number }> = ({ size = 18 }) => (
  <div
    style={{
      width: size,
      height: size,
      border: `${Math.max(2, Math.round(size / 8))}px solid transparent`,
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }}
  />
);

export const AuthButton: FC<
  DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
    loading?: boolean;
  }
> = ({ children, loading, className, disabled, ...props }) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [height, setHeight] = useState(44);
  useEffect(() => {
    setHeight(ref.current?.offsetHeight || 44);
  }, []);
  return (
    <button
      {...props}
      ref={ref}
      type={props.type || 'button'}
      disabled={disabled || loading}
      className={clsx(
        'group relative flex w-full items-center justify-center overflow-hidden',
        'rounded-[var(--voc-radius-pill)] px-[24px] py-[12px]',
        'text-[14px] font-[800] text-white transition-all duration-300',
        (disabled || loading) && 'pointer-events-none opacity-60',
        className
      )}
      style={{
        background: 'var(--voc-aurora)',
        boxShadow: 'var(--voc-shadow-button)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-15deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 group-hover:translate-x-full"
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size={height / 2.6} />
        </div>
      )}
      <span className={clsx('relative flex items-center gap-[8px]', loading && 'invisible')}>
        {children}
      </span>
    </button>
  );
};

export const AuthInput: FC<
  DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement> & {
    label: string;
    name: string;
    error?: string;
    removeError?: boolean;
  }
> = ({ label, name, error, removeError, className, ...rest }) => {
  const form = useFormContext();
  const fieldError =
    error ?? (form?.formState?.errors?.[name]?.message as string | undefined);
  return (
    <div className="flex flex-col gap-[4px]">
      <input
        id={name}
        aria-label={label}
        className={clsx(
          'h-[42px] w-full rounded-[var(--voc-radius-pill)] px-[18px]',
          'bg-black/25 text-[13px] font-[600] text-[var(--voc-text-primary)] outline-none',
          'border border-[var(--voc-border-soft)] transition-all duration-300',
          'placeholder:text-[var(--voc-text-tertiary)]',
          'focus:border-[var(--voc-border-highlight)] focus:bg-[var(--voc-bg-app)] focus:shadow-[0_0_0_4px_rgba(124,94,225,0.2)]',
          className
        )}
        style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1)' }}
        {...(form ? form.register(name) : {})}
        {...rest}
      />
      {!removeError && fieldError && (
        <div className="text-[11px] text-[var(--voc-peach)]">{fieldError}</div>
      )}
    </div>
  );
};
