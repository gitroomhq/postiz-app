'use client';

import { FC, InputHTMLAttributes, LabelHTMLAttributes, ReactNode, TextareaHTMLAttributes, forwardRef } from 'react';

/**
 * Primitivo de input Vocaccio — extrai `inputCls` repetido em
 * client-form.component.tsx, client-detail.component.tsx (ContactModal,
 * InteractionModal) e project-form.component.tsx.
 */
export const INPUT_CLASSNAME =
  'w-full px-[14px] py-[10px] rounded-[10px] bg-newBgColor border border-newTableBorder text-[14px] text-newTextColor placeholder:text-newTableText outline-none focus:border-[var(--voc-violet)] transition-colors';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className = '', ...rest }, ref) => (
  <input ref={ref} className={`${INPUT_CLASSNAME} ${className}`} {...rest} />
));
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className = '', ...rest }, ref) => (
  <textarea ref={ref} className={`${INPUT_CLASSNAME} resize-none ${className}`} {...rest} />
));
Textarea.displayName = 'Textarea';

/**
 * Wrapper de campo (label + slot) — extrai o padrão `Field`/`fieldCls`+`labelCls`
 * repetido em client-form.component.tsx e client-detail.component.tsx.
 */
export interface FieldProps extends LabelHTMLAttributes<HTMLLabelElement> {
  label: string;
  required?: boolean;
  children: ReactNode;
}

export const Field: FC<FieldProps> = ({ label, required, children, className = '', ...rest }) => (
  <div className={`flex flex-col gap-[6px] ${className}`}>
    <label className="text-[12px] font-[700] text-newTableText uppercase tracking-[0.06em]" {...rest}>
      {label}
      {required && <span style={{ color: 'var(--voc-rose)' }} className="ml-[2px]">*</span>}
    </label>
    {children}
  </div>
);
