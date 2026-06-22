// Astrology fragment bank — Big Three (Sun/Moon/Rising) × 12 signs.
// Composed from one curated trait per sign + a role-specific framing, so the
// 36 fragments stay DRY and consistently tagged. Planet-in-house prose is out
// of scope for this slice (shown in the visual table only).

import { Fragment, ThemeKey, ZodiacSignKey } from '../types';
import { SIGN_PT } from '../signs';

interface SignTrait {
  /** Verb phrase that reads naturally after "sua identidade central ...". */
  essence: string;
  tags: Partial<Record<ThemeKey, number>>;
}

const SIGN_TRAITS: Record<ZodiacSignKey, SignTrait> = {
  aries: {
    essence: 'se afirma pela iniciativa, pela coragem e pela vontade de abrir caminhos',
    tags: { lideranca: 2, transformacao: 1, liberdade: 1 },
  },
  taurus: {
    essence: 'busca solidez, beleza concreta e a construção paciente do que dura',
    tags: { estrutura: 2, criacao: 1, servico: 1 },
  },
  gemini: {
    essence: 'vive da curiosidade, da palavra e da troca ágil de ideias',
    tags: { comunicacao: 2, conexao: 1, intuicao: 1 },
  },
  cancer: {
    essence: 'se move pelo cuidado, pela memória afetiva e pela proteção dos seus',
    tags: { servico: 2, conexao: 1, introspeccao: 1 },
  },
  leo: {
    essence: 'expressa-se com calor, criatividade e presença que naturalmente irradia',
    tags: { criacao: 2, lideranca: 1, comunicacao: 1 },
  },
  virgo: {
    essence: 'aprimora, organiza e serve com precisão e olhar para o detalhe',
    tags: { estrutura: 2, estrategia: 1, servico: 1 },
  },
  libra: {
    essence: 'harmoniza, conecta pessoas e busca beleza, justiça e equilíbrio',
    tags: { conexao: 2, comunicacao: 1, criacao: 1 },
  },
  scorpio: {
    essence: 'mergulha fundo, regenera-se e transforma o que toca em verdade',
    tags: { transformacao: 2, introspeccao: 1, intuicao: 1 },
  },
  sagittarius: {
    essence: 'expande horizontes, ensina e busca sentido e liberdade',
    tags: { ensino: 2, liberdade: 1, comunicacao: 1 },
  },
  capricorn: {
    essence: 'constrói com disciplina, assume responsabilidade e mira o longo prazo',
    tags: { estrutura: 2, lideranca: 1, estrategia: 1 },
  },
  aquarius: {
    essence: 'inova, pensa o coletivo e rompe padrões em nome do futuro',
    tags: { transformacao: 2, liberdade: 1, estrategia: 1 },
  },
  pisces: {
    essence: 'sente o invisível, imagina e se dissolve na compaixão e na arte',
    tags: { intuicao: 2, introspeccao: 1, criacao: 1 },
  },
};

function scale(
  tags: Partial<Record<ThemeKey, number>>,
  factor: number
): Partial<Record<ThemeKey, number>> {
  const out: Partial<Record<ThemeKey, number>> = {};
  for (const [k, v] of Object.entries(tags)) {
    out[k as ThemeKey] = (v ?? 0) * factor;
  }
  return out;
}

export function sunFragment(sign: ZodiacSignKey): Fragment {
  const t = SIGN_TRAITS[sign];
  return {
    id: `astro-sun-${sign}`,
    section: 'astrology',
    text: `Com o Sol em ${SIGN_PT[sign]}, sua identidade central ${t.essence}. É o núcleo de quem você é — o brilho que pede para ser vivido.`,
    tags: scale(t.tags, 2),
  };
}

export function moonFragment(sign: ZodiacSignKey): Fragment {
  const t = SIGN_TRAITS[sign];
  return {
    id: `astro-moon-${sign}`,
    section: 'astrology',
    text: `A Lua em ${SIGN_PT[sign]} colore seu mundo interno: por dentro, você ${t.essence}. É o que te nutre e te acalma quando ninguém está olhando.`,
    tags: scale(t.tags, 1),
  };
}

export function risingFragment(sign: ZodiacSignKey): Fragment {
  const t = SIGN_TRAITS[sign];
  return {
    id: `astro-rising-${sign}`,
    section: 'astrology',
    text: `Com Ascendente em ${SIGN_PT[sign]}, é assim que você chega ao mundo e abre suas portas: ${t.essence}.`,
    tags: scale(t.tags, 1.5),
  };
}
