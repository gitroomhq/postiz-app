'use client';

import { FC, HTMLAttributes } from 'react';

/**
 * Primitivo de badge/pill Vocaccio — extrai o padrão de `StatusBadge` que estava
 * DUPLICADO (mesmo `STATUS_MAP` copiado) em
 * apps/frontend/src/components/hub/crm/clients-list.component.tsx e
 * apps/frontend/src/components/hub/crm/client-detail.component.tsx, e o padrão
 * genérico de pill (`rounded-full` + bg/color dinâmicos) repetido em
 * content-kanban.component.tsx e project-detail-client.component.tsx.
 *
 * Não fixa cores — cada tela já calcula bg/color a partir do próprio domínio
 * (status do cliente, status do projeto, status do conteúdo), então o Badge
 * só aplica a forma (pill, padding, tipografia) e recebe bg/color como props.
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  bg: string;
  color: string;
}

export const Badge: FC<BadgeProps> = ({ bg, color, className = '', style, children, ...rest }) => (
  <span
    className={`inline-flex items-center px-[10px] py-[3px] rounded-full text-[11px] font-[700] ${className}`}
    style={{ background: bg, color, ...style }}
    {...rest}
  >
    {children}
  </span>
);

/** Mapa de status de cliente CRM compartilhado — antes duplicado em clients-list e client-detail. */
export const CRM_CLIENT_STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE: { label: 'Ativo', bg: 'rgba(50, 213, 131, 0.16)', color: '#32d583' },
  INACTIVE: { label: 'Inativo', bg: 'rgba(150, 150, 150, 0.16)', color: '#9c9c9c' },
  PROSPECT: { label: 'Prospecto', bg: 'rgba(232, 154, 123, 0.18)', color: '#e89a7b' },
  LEAD: { label: 'Lead', bg: 'rgba(115, 96, 170, 0.18)', color: '#b69dec' },
};

export const ClientStatusBadge: FC<{ status: string }> = ({ status }) => {
  const s = CRM_CLIENT_STATUS_MAP[status] ?? { label: status, bg: 'rgba(200,200,200,0.16)', color: '#9c9c9c' };
  return (
    <Badge bg={s.bg} color={s.color}>
      {s.label}
    </Badge>
  );
};
