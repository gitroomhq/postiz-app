'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { INPUT_CLASSNAME } from './input.component';

/**
 * Primitivo de select Vocaccio — no código real (client-form.component.tsx,
 * client-detail.component.tsx InteractionModal) o <select> reusa a mesma
 * classe do input (`inputCls`), não existe um estilo de select distinto.
 * Este componente só formaliza esse reuso — não inventa uma variante nova.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, className = '', children, ...rest }, ref) => (
    <select ref={ref} className={`${INPUT_CLASSNAME} ${className}`} {...rest}>
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  ),
);
Select.displayName = 'Select';
