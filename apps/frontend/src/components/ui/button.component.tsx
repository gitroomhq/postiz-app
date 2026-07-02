'use client';

import { ButtonHTMLAttributes, FC, forwardRef } from 'react';

/**
 * Primitivo de botão Vocaccio — extrai o padrão pill (--voc-radius-pill / rounded-full)
 * já repetido em apps/frontend/src/components/hub/crm/*.component.tsx
 * (ex: content-kanban.component.tsx, client-detail.component.tsx, client-form.component.tsx).
 *
 * Variantes cobrem exatamente os casos já usados no código:
 * - "primary": background: var(--voc-aurora), texto branco — CTA principal (salvar, criar, adicionar).
 * - "outline": borda newTableBorder + hover bg-newBgColor — ação secundária/cancelar.
 * - "rose": pill sutil rosa translúcido (rgba(207,98,149,0.12) + text var(--voc-rose)) —
 *   ação de destaque leve (ex: "Enviar para aprovação" no kanban).
 * - "ghost": sem fundo, texto newTableText, hover newTextColor — ação terciária/ícone+texto.
 */
export type ButtonVariant = 'primary' | 'outline' | 'rose' | 'ghost';
export type ButtonSize = 'sm' | 'md';
/** "pill" = rounded-full (padrão, CTAs/tags); "md" = rounded-[12px] (botões de ação em formulário/modal, ex: Salvar/Cancelar). */
export type ButtonRadius = 'pill' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
}

const SIZE_CLS: Record<ButtonSize, string> = {
  sm: 'text-[11px] font-[700] px-[12px] py-[5px]',
  md: 'text-[13px] font-[700] px-[14px] py-[10px]',
};

const RADIUS_CLS: Record<ButtonRadius, string> = {
  pill: 'rounded-full',
  md: 'rounded-[12px]',
};

const VARIANT_BASE_CLS: Record<ButtonVariant, string> = {
  primary: 'text-white disabled:opacity-60',
  outline: 'text-newTextColor border border-newTableBorder hover:bg-newBgColor',
  rose: 'transition-colors',
  ghost: 'text-newTableText hover:text-newTextColor transition-colors',
};

function variantStyle(variant: ButtonVariant): React.CSSProperties | undefined {
  switch (variant) {
    case 'primary':
      return { background: 'var(--voc-aurora)' };
    case 'rose':
      return { background: 'rgba(207,98,149,0.12)', color: 'var(--voc-rose)' };
    default:
      return undefined;
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', radius = 'pill', className = '', style, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-[6px] transition-all ${RADIUS_CLS[radius]} ${SIZE_CLS[size]} ${VARIANT_BASE_CLS[variant]} ${className}`}
        style={{ ...variantStyle(variant), ...style }}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
