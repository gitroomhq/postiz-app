// Tzolkin / Dreamspell Kin — pure TypeScript, zero deps.
// Extracted from hub-dashboard.component.tsx so both the Hub "Kin do Dia" widget
// and the Religare natal reading share one source of truth.

import { KinResult } from './types';

export const SEALS = [
  'Dragão', 'Vento', 'Noite', 'Semente', 'Serpente',
  'Transformador', 'Veado', 'Estrela', 'Lua', 'Cão',
  'Macaco', 'Humano', 'Andarilho Celeste', 'Mago', 'Águia',
  'Guerreiro', 'Terra', 'Espelho', 'Tempestade', 'Sol',
];

export const TONES = [
  'Magnético', 'Lunar', 'Elétrico', 'Auto-Existente', 'Radiante',
  'Rítmico', 'Ressonante', 'Galático', 'Solar', 'Planetário',
  'Espectral', 'Cristal', 'Cósmico',
];

export const SEAL_ACCENT = ['#cf6295', '#dcd0c3', '#2897bf', '#e89a7b'];

/**
 * Compute the Dreamspell Kin for any date.
 * Anchor: 26/Jul/1987 = Kin 34. Day-count is taken at UTC midnight so the
 * result is stable regardless of the local time component of `date`.
 */
export function kinForDate(date: Date): KinResult {
  const anchor = new Date('1987-07-26T00:00:00Z').getTime();
  const day = new Date(date.getTime());
  day.setUTCHours(0, 0, 0, 0);
  const days = Math.floor((day.getTime() - anchor) / 86400000);
  const kin = (((34 - 1 + days) % 260) + 260) % 260 + 1;
  const sealIndex = (kin - 1) % 20;
  const toneIndex = (kin - 1) % 13;
  return {
    kin,
    seal: SEALS[sealIndex],
    tone: TONES[toneIndex],
    sealIndex,
    toneIndex,
    accent: SEAL_ACCENT[sealIndex % 4],
  };
}

/** Kin for today (the Hub "Kin do Dia"). */
export function getTodayKin(): KinResult {
  return kinForDate(new Date());
}
