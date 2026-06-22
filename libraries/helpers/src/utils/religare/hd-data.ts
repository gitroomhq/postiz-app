// Human Design — classic Rave Mandala constants (Ra Uru Hu system). These are
// public-domain reference tables of the system itself (not curated content),
// safe for the frontend bundle (no ephemeris). The calculation engine that
// consumes them lives in ./hd.ts (kept out of the barrel, same as astrology.ts).

import { CenterKey } from './types';

/**
 * The 64 gates in zodiac order, ascending, 5.625° each (360/64). The wheel
 * does NOT start at 0° Aries — Gate 25 (index 0 below) starts at 358.25°
 * absolute (28°15' Pisces) and straddles the 0°/360° boundary, ending at
 * 3°52' Aries. So bucketing must shift by GATE_WHEEL_START_DEGREE first:
 * gate = GATE_WHEEL[Math.floor(((eclipticDegree - GATE_WHEEL_START_DEGREE + 360) % 360) / 5.625)].
 * (Verified against two independent published degree tables.)
 */
export const GATE_WHEEL: number[] = [
  25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53,
  62, 56, 31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44,
  1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60, 41, 19, 13, 49, 30, 55,
  37, 63, 22, 36,
];

export const GATE_WHEEL_START_DEGREE = 358.25;
export const DEGREES_PER_GATE = 5.625;
export const DEGREES_PER_LINE = DEGREES_PER_GATE / 6; // 0.9375

export const CENTERS: CenterKey[] = [
  'head',
  'ajna',
  'throat',
  'g',
  'heart',
  'spleen',
  'sacral',
  'solarPlexus',
  'root',
];

export const CENTER_LABELS_PT: Record<CenterKey, string> = {
  head: 'Cabeça (Inspiração)',
  ajna: 'Ajna (Mente)',
  throat: 'Garganta (Expressão)',
  g: 'G (Identidade)',
  heart: 'Coração/Ego (Vontade)',
  spleen: 'Baço (Instinto)',
  sacral: 'Sacral (Vitalidade)',
  solarPlexus: 'Plexo Solar (Emoção)',
  root: 'Raiz (Pressão)',
};

/** The 4 "motor" centers that can drive a Throat connection. */
export const MOTOR_CENTERS: CenterKey[] = ['sacral', 'heart', 'solarPlexus', 'root'];

/** Gate → Center, all 64 gates. */
export const GATE_CENTER: Record<number, CenterKey> = {
  62: 'throat', 23: 'throat', 56: 'throat', 16: 'throat', 20: 'throat',
  31: 'throat', 8: 'throat', 33: 'throat', 35: 'throat', 12: 'throat', 45: 'throat',
  64: 'head', 61: 'head', 63: 'head',
  58: 'root', 38: 'root', 54: 'root', 53: 'root', 60: 'root', 52: 'root',
  19: 'root', 39: 'root', 41: 'root',
  47: 'ajna', 24: 'ajna', 4: 'ajna', 11: 'ajna', 43: 'ajna', 17: 'ajna',
  48: 'spleen', 57: 'spleen', 44: 'spleen', 50: 'spleen', 32: 'spleen',
  28: 'spleen', 18: 'spleen',
  37: 'solarPlexus', 6: 'solarPlexus', 49: 'solarPlexus', 22: 'solarPlexus',
  55: 'solarPlexus', 36: 'solarPlexus', 30: 'solarPlexus',
  21: 'heart', 40: 'heart', 26: 'heart', 51: 'heart',
  34: 'sacral', 5: 'sacral', 14: 'sacral', 29: 'sacral', 59: 'sacral',
  9: 'sacral', 3: 'sacral', 42: 'sacral', 27: 'sacral',
  1: 'g', 13: 'g', 7: 'g', 2: 'g', 15: 'g', 10: 'g', 25: 'g', 46: 'g',
};

/** The 36 channels — gate pairs (cross-validated) + classic reference name. */
export const CHANNELS: { gates: [number, number]; name: string }[] = [
  { gates: [1, 8], name: 'Inspiração' },
  { gates: [2, 14], name: 'O Pulso' },
  { gates: [3, 60], name: 'Mutação' },
  { gates: [4, 63], name: 'Lógica' },
  { gates: [5, 15], name: 'Ritmo' },
  { gates: [6, 59], name: 'Acasalamento' },
  { gates: [7, 31], name: 'O Alfa' },
  { gates: [9, 52], name: 'Concentração' },
  { gates: [10, 20], name: 'Despertar' },
  { gates: [10, 34], name: 'Exploração' },
  { gates: [10, 57], name: 'Forma Perfeita' },
  { gates: [11, 56], name: 'Curiosidade' },
  { gates: [12, 22], name: 'Abertura' },
  { gates: [13, 33], name: 'O Pródigo' },
  { gates: [16, 48], name: 'O Comprimento de Onda' },
  { gates: [17, 62], name: 'Aceitação' },
  { gates: [18, 58], name: 'Julgamento' },
  { gates: [19, 49], name: 'Síntese' },
  { gates: [20, 34], name: 'Carisma' },
  { gates: [20, 57], name: 'Onda Cerebral' },
  { gates: [21, 45], name: 'Dinheiro' },
  { gates: [23, 43], name: 'Estruturação' },
  { gates: [24, 61], name: 'Consciência' },
  { gates: [25, 51], name: 'Iniciação' },
  { gates: [26, 44], name: 'Rendição' },
  { gates: [27, 50], name: 'Preservação' },
  { gates: [28, 38], name: 'Luta' },
  { gates: [29, 46], name: 'Descoberta' },
  { gates: [30, 41], name: 'Reconhecimento' },
  { gates: [32, 54], name: 'Transformação' },
  { gates: [34, 57], name: 'Poder' },
  { gates: [35, 36], name: 'Transitoriedade' },
  { gates: [37, 40], name: 'Comunidade' },
  { gates: [39, 55], name: 'Emoção' },
  { gates: [42, 53], name: 'Maturação' },
  { gates: [47, 64], name: 'Abstração' },
];
