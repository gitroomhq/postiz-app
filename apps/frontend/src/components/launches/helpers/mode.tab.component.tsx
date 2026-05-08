'use client';

import React, { FC } from 'react';
import clsx from 'clsx';

/**
 * Aba de modo (T2X / I2X) usada nos modais de IA. Reaproveitada por
 * AiVideo (T2V/I2V) e AiImage (T2I/I2I) para padronizar visual.
 *
 * Layout: cartao com icone a esquerda + label/hint empilhados a direita.
 * Estado ativo recebe fundo `bg-sixth` (contraste com a barra de tabs);
 * inativo fica em `text-customColor18`.
 */
export interface ModeTabProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}

export const ModeTab: FC<ModeTabProps> = ({
  active,
  disabled,
  onClick,
  icon,
  label,
  hint,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={clsx(
      'flex items-center gap-[10px] px-[12px] py-[10px] rounded-[6px] text-start transition-all',
      active
        ? 'bg-sixth shadow-sm text-textColor'
        : 'text-customColor18 hover:text-textColor',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    <span
      className={clsx(
        'flex w-[28px] h-[28px] items-center justify-center rounded-[6px] flex-shrink-0',
        active ? 'bg-newColColor' : 'bg-newColColor/40'
      )}
    >
      {icon}
    </span>
    <span className="flex flex-col leading-tight overflow-hidden">
      <span className="text-[13px] font-semibold truncate">{label}</span>
      <span className="text-[11px] text-customColor18 truncate">{hint}</span>
    </span>
  </button>
);
