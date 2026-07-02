'use client';

import { FC, HTMLAttributes } from 'react';

/**
 * Primitivo de card Vocaccio — extrai a classe `voc-glass-card` (definida em
 * apps/frontend/src/app/global.scss, tokens --voc-bg-surface/--voc-border-soft/
 * --voc-shadow-glass) já usada em client-detail.component.tsx (ProjectsTab,
 * ContactsTab, InteractionsTab, NotesTab) e crm-modal.component.tsx.
 *
 * Não cria um novo mecanismo de "Panel" separado — no código real, cards e
 * painéis internos usam a mesma classe `voc-glass-card` com raio variável
 * (14px em listas de item, 20px em modais), então este componente cobre os
 * dois casos via a prop `radius`.
 */
export type CardRadius = 'md' | 'lg';

const RADIUS_CLS: Record<CardRadius, string> = {
  md: 'rounded-[14px]',
  lg: 'rounded-[20px]',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  radius?: CardRadius;
  /** Se true, aplica padding padrão (18px x / 16px y) igual aos cards de lista do CRM. */
  padded?: boolean;
}

export const Card: FC<CardProps> = ({ radius = 'md', padded = true, className = '', children, ...rest }) => {
  return (
    <div
      className={`voc-glass-card ${RADIUS_CLS[radius]} ${padded ? 'px-[18px] py-[16px]' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
