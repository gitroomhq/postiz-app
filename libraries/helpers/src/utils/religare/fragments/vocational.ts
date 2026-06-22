// Vocational fragment bank — reuses VOCATION_INFO names/descriptions and tags
// each calling with the themes it expresses. Higher-ranked callings weigh more.

import { VOCATION_INFO } from '../vocational';
import { Fragment, ThemeKey, VocationKey } from '../types';

const VOCATION_TAGS: Record<VocationKey, Partial<Record<ThemeKey, number>>> = {
  creative: { criacao: 2 },
  analytical: { estrategia: 2, estrutura: 1 },
  caregiving: { servico: 2, conexao: 1 },
  leadership: { lideranca: 2, estrategia: 1 },
  entrepreneurial: { lideranca: 1, estrategia: 1, transformacao: 1 },
  communication: { comunicacao: 2, conexao: 1 },
  spiritual: { intuicao: 2, introspeccao: 1, servico: 1 },
  technical: { estrutura: 2, estrategia: 1 },
  artisan: { criacao: 1, estrutura: 1 },
  educator: { ensino: 2, comunicacao: 1 },
};

function scale(
  tags: Partial<Record<ThemeKey, number>>,
  factor: number
): Partial<Record<ThemeKey, number>> {
  const out: Partial<Record<ThemeKey, number>> = {};
  for (const [k, v] of Object.entries(tags)) out[k as ThemeKey] = (v ?? 0) * factor;
  return out;
}

/**
 * Fragment for one calling. `rank` 0 = strongest (weight 2), then tapers.
 */
export function vocationFragment(key: VocationKey, rank: number): Fragment {
  const info = VOCATION_INFO[key];
  const factor = rank === 0 ? 2 : rank === 1 ? 1.5 : 1;
  return {
    id: `voc-${key}`,
    section: 'vocational',
    text: `${info.name}: ${info.description}`,
    tags: scale(VOCATION_TAGS[key], factor),
  };
}
