'use client';

import {
  ButtonHTMLAttributes,
  DetailedHTMLProps,
  FC,
  useEffect,
  useRef,
  useState,
} from 'react';
import { clsx } from 'clsx';
const ReactLoading = ({ color = 'currentColor', width = 20, height = 20 }: { type?: string; color?: string; width?: number; height?: number }) => {
  const size = Math.min(width, height);
  const borderWidth = Math.max(2, Math.round(size / 8));
  return (
    <div
      style={{
        width: size,
        height: size,
        // Longhands only — mixing `border` shorthand with `borderTopColor`
        // triggers React's "Updating a style property during rerender" overlay.
        borderWidth,
        borderStyle: 'solid',
        borderColor: 'transparent',
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  );
};
export const Button: FC<
  DetailedHTMLProps<
    ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > & {
    secondary?: boolean;
    loading?: boolean;
    innerClassName?: string;
    /**
     * Visual variant. `primary` (brand fill) is the default; `secondary` keeps
     * the legacy neutral fill. New: `outline` and `ghost` for lower-emphasis
     * actions. The legacy `secondary` boolean still maps to `secondary`.
     */
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
  }
> = ({
  children,
  loading,
  innerClassName,
  secondary,
  variant,
  size = 'md',
  ...props
}) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    setHeight(ref.current?.offsetHeight || 40);
  }, []);
  // `secondary` (legacy boolean) still wins for back-compat; otherwise use the
  // variant, defaulting to the brand primary.
  const resolved = secondary ? 'secondary' : variant || 'primary';
  // btnPrimary, not forth: both resolve to the brand purple today, but forth is
  // a legacy palette slot while btnPrimary is the token the rest of the chrome
  // reads. One token means the brand can move in one place.
  const variantClass = {
    primary: 'bg-btnPrimary text-pqOnBrand hover:opacity-90',
    secondary: 'bg-third text-newTextColor hover:bg-boxHover',
    outline:
      'bg-transparent border border-newBorder text-newTextColor hover:bg-boxHover',
    ghost: 'bg-transparent text-newTextColor hover:bg-boxHover',
    danger: 'bg-pqDanger text-pqOnBrand hover:opacity-90',
  }[resolved];
  const sizeClass = {
    sm: 'h-[34px] px-[16px] text-[13px]',
    md: 'h-[40px] px-[24px]',
    lg: 'h-[48px] px-[28px] text-[15px]',
  }[size];
  return (
    <button
      {...props}
      type={props.type || 'button'}
      ref={ref}
      className={clsx(
        (props.disabled || loading) && 'opacity-50 pointer-events-none',
        variantClass,
        sizeClass,
        'rounded-[8px] font-[500] cursor-pointer items-center justify-center flex relative transition-all',
        // Keyboard focus has to be visible; the app's global rule only drops
        // the ring for pointer interaction.
        'outline-none focus-visible:ring-2 focus-visible:ring-btnPrimary focus-visible:ring-offset-2 focus-visible:ring-offset-pqInner',
        props?.className
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ReactLoading
            type="spin"
            width={height! / 2}
            height={height! / 2}
          />
        </div>
      )}
      <div
        className={clsx(
          innerClassName,
          'flex-1 items-center justify-center flex',
          loading && 'invisible'
        )}
      >
        {children}
      </div>
    </button>
  );
};
