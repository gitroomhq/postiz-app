'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useVolatisClient } from '@gitroom/frontend/components/hub/volatis-client-context';

/**
 * Atalho do cockpit Volatis para a Galeria de Carrosséis (entry point do
 * gerador), levando o cliente ativo (per-client channels da Fase 3) como
 * query param para pré-selecionar o projeto.
 */
export const VolatisCarouselLaunch = () => {
  const { selectedClientId } = useVolatisClient();
  const href = selectedClientId
    ? `/hub/volatis/carrosseis?clientId=${selectedClientId}`
    : '/hub/volatis/carrosseis';

  return (
    <Link
      href={href}
      className="flex items-center gap-[6px] text-[12px] font-[800] px-[14px] py-[7px] rounded-full text-white transition-opacity hover:opacity-90"
      style={{ background: 'var(--voc-aurora)', boxShadow: '0 8px 20px rgba(207,98,149,0.28)' }}
    >
      <Sparkles size={14} />
      Carrosséis
    </Link>
  );
};
