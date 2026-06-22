// Archetype fragment bank — reuses the curated ARCHETYPE_INFO descriptions and
// attaches theme tags. Primary archetype weighs more than the secondary.

import { ARCHETYPE_INFO } from '../archetypes';
import { ArchetypeKey, Fragment, ThemeKey } from '../types';

const ARCHETYPE_TAGS: Record<ArchetypeKey, Partial<Record<ThemeKey, number>>> = {
  innocent: { intuicao: 1, conexao: 1 },
  sage: { ensino: 2, estrategia: 1, introspeccao: 1 },
  explorer: { liberdade: 2, transformacao: 1 },
  outlaw: { transformacao: 2, liberdade: 1 },
  magician: { transformacao: 2, intuicao: 1, criacao: 1 },
  hero: { lideranca: 2, transformacao: 1 },
  lover: { conexao: 2, criacao: 1 },
  jester: { comunicacao: 2, conexao: 1 },
  everyman: { conexao: 2, servico: 1 },
  caregiver: { servico: 2, conexao: 1 },
  ruler: { lideranca: 2, estrutura: 1, estrategia: 1 },
  creator: { criacao: 2, comunicacao: 1 },
};

function scale(
  tags: Partial<Record<ThemeKey, number>>,
  factor: number
): Partial<Record<ThemeKey, number>> {
  const out: Partial<Record<ThemeKey, number>> = {};
  for (const [k, v] of Object.entries(tags)) out[k as ThemeKey] = (v ?? 0) * factor;
  return out;
}

export function primaryArchetypeFragment(key: ArchetypeKey): Fragment {
  const info = ARCHETYPE_INFO[key];
  return {
    id: `arch-primary-${key}`,
    section: 'archetypes',
    text: `Seu arquétipo dominante é o ${info.name} — ${info.tagline.toLowerCase()}. ${info.description}`,
    tags: scale(ARCHETYPE_TAGS[key], 2),
  };
}

export function secondaryArchetypeFragment(key: ArchetypeKey): Fragment {
  const info = ARCHETYPE_INFO[key];
  return {
    id: `arch-secondary-${key}`,
    section: 'archetypes',
    text: `Logo atrás, o ${info.name} (${info.tagline.toLowerCase()}) tempera sua expressão e abre uma segunda camada de como você age no mundo.`,
    tags: scale(ARCHETYPE_TAGS[key], 1),
  };
}
