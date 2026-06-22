// Pure zodiac helpers — no ephemeris, safe for the frontend bundle.
// The natal calculation (astrology.ts) imports the heavy ephemeris lib and is
// NOT re-exported from the barrel; these pure helpers are.

import { AstrologyResult, SignPlacement, ZodiacSignKey } from './types';

/** Signs in ecliptic order, starting at 0° Aries. */
export const SIGN_KEYS: ZodiacSignKey[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

export const SIGN_PT: Record<ZodiacSignKey, string> = {
  aries: 'Áries',
  taurus: 'Touro',
  gemini: 'Gêmeos',
  cancer: 'Câncer',
  leo: 'Leão',
  virgo: 'Virgem',
  libra: 'Libra',
  scorpio: 'Escorpião',
  sagittarius: 'Sagitário',
  capricorn: 'Capricórnio',
  aquarius: 'Aquário',
  pisces: 'Peixes',
};

/** Map an ecliptic longitude (0–360) to its sign + degree within the sign. */
export function signFromDegree(eclipticDegree: number): SignPlacement {
  const deg = ((eclipticDegree % 360) + 360) % 360;
  const idx = Math.floor(deg / 30) % 12;
  const sign = SIGN_KEYS[idx];
  return { sign, signPt: SIGN_PT[sign], degreeInSign: deg - idx * 30 };
}

/** PT name → AstroChart expects capitalized English planet keys. */
const ASTROCHART_PLANET_NAME: Record<string, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  northnode: 'NNode',
  lilith: 'Lilith',
};

/**
 * Convert a stored AstrologyResult into @astrodraw/astrochart radix data.
 * Pure (numeric only) — the frontend calls this on the persisted Json.
 */
export function toAstroChartData(result: AstrologyResult): {
  planets: Record<string, number[]>;
  cusps: number[];
} {
  const planets: Record<string, number[]> = {};
  for (const p of result.planets) {
    const name = ASTROCHART_PLANET_NAME[p.key] || p.name;
    planets[name] = [p.eclipticDegree];
  }
  const cusps = result.houses
    .slice()
    .sort((a, b) => a.house - b.house)
    .map((h) => h.eclipticDegree);
  return { planets, cusps };
}
