// Natal chart calculation — wraps circular-natal-horoscope-js (Moshier
// ephemeris, zero native build). This module imports the heavy ephemeris lib and
// is therefore NOT re-exported from the barrel (index.ts); backend imports it by
// subpath so the ephemeris never reaches the frontend bundle.
//
// Historical DST: the lib resolves the IANA zone from lat/lng (tz-lookup) and
// converts via moment-timezone, which DOES honour historical daylight-saving
// rules (verified: 11/12/1987 07:45 São Paulo → offset −02:00, BR summer time).
// So we pass local clock time + lat/lng and let the lib do the conversion; we
// record the resolved offset/zone for auditability.

// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Origin, Horoscope } from 'circular-natal-horoscope-js';
import { signFromDegree } from './signs';
import {
  AstroAspect,
  AstrologyResult,
  HouseCusp,
  NatalInput,
  PlanetPosition,
} from './types';

/** Bodies/points we surface, in display order, with PT names. */
const BODY_PT: Record<string, string> = {
  sun: 'Sol',
  moon: 'Lua',
  mercury: 'Mercúrio',
  venus: 'Vênus',
  mars: 'Marte',
  jupiter: 'Júpiter',
  saturn: 'Saturno',
  uranus: 'Urano',
  neptune: 'Netuno',
  pluto: 'Plutão',
  chiron: 'Quíron',
  northnode: 'Nodo Norte',
  lilith: 'Lilith',
};

const BODY_ORDER = Object.keys(BODY_PT);

function eclipticOf(entry: any): number {
  return entry?.ChartPosition?.Ecliptic?.DecimalDegrees ?? 0;
}

function toPlanet(entry: any, key: string): PlanetPosition {
  const eclipticDegree = eclipticOf(entry);
  const placement = signFromDegree(eclipticDegree);
  return {
    key,
    name: BODY_PT[key] || entry?.label || key,
    ...placement,
    eclipticDegree,
    house: entry?.House?.id ?? null,
    retrograde: !!entry?.isRetrograde,
  };
}

/** Parse the numeric UTC offset (minutes) from an ISO string like ...-02:00. */
function parseOffsetMinutes(isoWithOffset: string): number {
  const m = /([+-])(\d{2}):(\d{2})$/.exec(isoWithOffset || '');
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

/**
 * Compute a tropical/Placidus natal chart. Throws on invalid input — the caller
 * (service) wraps this in try/catch so a bad birth date never 500s the save.
 */
export function computeNatalChart(input: NatalInput): AstrologyResult {
  const [y, mo, d] = input.birthDate.split('-').map((n) => parseInt(n, 10));
  const [hh, mm] = input.birthTime.split(':').map((n) => parseInt(n, 10));
  if (![y, mo, d, hh, mm].every((n) => Number.isFinite(n))) {
    throw new Error('Data ou hora de nascimento inválida');
  }

  const origin = new Origin({
    year: y,
    month: mo - 1, // lib uses 0-indexed months
    date: d,
    hour: hh,
    minute: mm,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  const horoscope = new Horoscope({
    origin,
    houseSystem: 'placidus',
    zodiac: 'tropical',
    aspectPoints: ['bodies', 'points', 'angles'],
    aspectWithPoints: ['bodies', 'points', 'angles'],
    aspectTypes: ['major'],
  });

  const bodies = horoscope.CelestialBodies as any;
  const points = horoscope.CelestialPoints as any;
  const planets: PlanetPosition[] = [];
  for (const key of BODY_ORDER) {
    const entry = bodies?.[key] ?? points?.[key];
    if (entry) planets.push(toPlanet(entry, key));
  }

  const houses: HouseCusp[] = ((horoscope.Houses as any[]) || []).map((h) => {
    const eclipticDegree = h?.ChartPosition?.StartPosition?.Ecliptic?.DecimalDegrees ?? 0;
    const placement = signFromDegree(eclipticDegree);
    return {
      house: h?.id ?? 0,
      eclipticDegree,
      sign: placement.sign,
      signPt: placement.signPt,
    };
  });

  const ascDeg = eclipticOf(horoscope.Ascendant);
  const mcDeg = eclipticOf(horoscope.Midheaven);
  const sunDeg = eclipticOf(bodies?.sun);
  const moonDeg = eclipticOf(bodies?.moon);

  const aspects: AstroAspect[] = ((horoscope.Aspects as any)?.all || []).map((a: any) => ({
    a: a.point1Key,
    b: a.point2Key,
    type: a.aspectKey,
    orb: typeof a.orb === 'number' ? Math.round(a.orb * 100) / 100 : 0,
  }));

  return {
    bigThree: {
      sun: signFromDegree(sunDeg),
      moon: signFromDegree(moonDeg),
      rising: signFromDegree(ascDeg),
    },
    planets,
    houses,
    angles: {
      ascendant: { ...signFromDegree(ascDeg), eclipticDegree: ascDeg },
      midheaven: { ...signFromDegree(mcDeg), eclipticDegree: mcDeg },
    },
    aspects,
    utcOffsetMinutes: parseOffsetMinutes(origin.localTimeFormatted),
    ianaTz: origin.timezone?.name || input.ianaTz,
  };
}
