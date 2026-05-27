'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, type MotionProps, useReducedMotion } from 'framer-motion';
import clsx from 'clsx';

type GlassVariant = 'base' | 'elevated' | 'subtle' | 'modal';

interface GlassCardProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  variant?: GlassVariant;
  hover?: boolean;
  /** Glow prop preserved for backwards compat; ignored — Linear-flat = no glow */
  glow?: 'none' | 'violet' | 'cyan' | 'pink' | 'aurora';
  radius?: 'lg' | 'xl' | '2xl' | '3xl';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: ReactNode;
  motionProps?: MotionProps;
}

// Linear-flat surfaces: solid yellow-tinted dark, 1px border, no blur required
const variantClasses: Record<GlassVariant, string> = {
  base: 'bg-customColor1 border border-borderGlass',
  elevated: 'bg-customColor35 border border-borderGlassStrong',
  subtle: 'bg-customColor16 border border-borderGlass',
  modal: 'bg-modalCustom border border-borderGlassStrong shadow-glassLg',
};

const radiusClasses = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
} as const;

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
} as const;

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      variant = 'base',
      hover = false,
      glow: _glowIgnored,
      radius = 'xl',
      padding = 'md',
      className,
      children,
      motionProps,
      ...rest
    },
    ref
  ) => {
    const reducedMotion = useReducedMotion();

    const baseClass = clsx(
      'relative isolate overflow-hidden',
      variantClasses[variant],
      radiusClasses[radius],
      paddingClasses[padding],
      hover &&
        'transition-[transform,border-color] duration-180 ease-out hover:border-borderGlassStrong hover:-translate-y-0.5 cursor-pointer',
      className
    );

    if (motionProps && !reducedMotion) {
      return (
        <motion.div ref={ref} className={baseClass} {...motionProps} {...(rest as MotionProps)}>
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={baseClass} {...rest}>
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
