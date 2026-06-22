// Moon phase — pure TypeScript, zero deps.
// Extracted from hub-dashboard.component.tsx; now accepts an optional date so it
// serves both the natal moon (birth date) and the moon of the day.

import { MoonPhase } from './types';

export const MOON_PHASES: Omit<MoonPhase, 'index'>[] = [
  { name: 'Lua Nova', emoji: '🌑', desc: 'Intenções e novos começos' },
  { name: 'Lua Crescente', emoji: '🌒', desc: 'Expansão e ação' },
  { name: 'Quarto Crescente', emoji: '🌓', desc: 'Decisões produtivas' },
  { name: 'Gibosa Crescente', emoji: '🌔', desc: 'Refinamento e crescimento' },
  { name: 'Lua Cheia', emoji: '🌕', desc: 'Culminação e revelação' },
  { name: 'Gibosa Minguante', emoji: '🌖', desc: 'Gratidão e integração' },
  { name: 'Quarto Minguante', emoji: '🌗', desc: 'Reflexão e liberação' },
  { name: 'Lua Minguante', emoji: '🌘', desc: 'Descanso e entrega' },
];

/**
 * Approximate lunar phase for a date (8 phases). Uses a known new moon
 * (2000-01-06 18:14 UTC) and the synodic month length.
 */
export function getMoonPhase(date: Date = new Date()): MoonPhase {
  const knownNew = new Date('2000-01-06T18:14:00Z').getTime();
  const cycle = 29.53058867 * 86400000;
  const elapsed = (((date.getTime() - knownNew) % cycle) + cycle) % cycle;
  const index = Math.floor((elapsed / cycle) * 8) % 8;
  return { ...MOON_PHASES[index], index };
}
