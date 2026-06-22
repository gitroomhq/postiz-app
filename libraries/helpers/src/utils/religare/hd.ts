// Human Design chart calculation — reuses the already-validated natal engine
// (computeNatalChart) for both the Design (unconscious, birth moment) and
// Personality (conscious, ~88 solar degrees before birth) activations. No new
// ephemeris dependency. This module pulls the ephemeris lib (via ./astrology)
// and is therefore NOT re-exported from the barrel; backend imports it by
// subpath, same pattern as ./astrology.
//
// Personality search trick: planetary longitude does not depend on location,
// only houses/angles do. So instead of re-deriving the birth place's timezone
// for an arbitrary past UTC instant, we run computeNatalChart at
// latitude=0/longitude=0 — a point whose IANA zone resolves to a fixed
// zero-offset zone — and feed it the UTC instant's clock components directly
// as "local" time. The houses/aspects of that call are discarded; only the
// body longitudes are used.

import { computeNatalChart } from './astrology';
import {
  CENTERS,
  CHANNELS,
  DEGREES_PER_GATE,
  DEGREES_PER_LINE,
  GATE_CENTER,
  GATE_WHEEL,
  GATE_WHEEL_START_DEGREE,
  MOTOR_CENTERS,
} from './hd-data';
import {
  CenterKey,
  GateActivation,
  HDAuthority,
  HDDefinition,
  HDType,
  HumanDesignResult,
  NatalInput,
} from './types';

/** The 13 classic Human Design bodies, in display order. */
const HD_BODY_KEYS = [
  'sun',
  'earth',
  'moon',
  'northnode',
  'southnode',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

const STRATEGY_PT: Record<HDType, string> = {
  generator: 'Responder',
  manifestingGenerator: 'Responder, depois informar',
  manifestor: 'Informar antes de agir',
  projector: 'Esperar o convite',
  reflector: 'Esperar um ciclo lunar completo',
};

function degreeToGate(eclipticDegree: number): GateActivation {
  const deg = ((eclipticDegree % 360) + 360) % 360;
  // The wheel starts at Gate 25 (358.25° absolute), not at 0° Aries.
  const shifted = ((deg - GATE_WHEEL_START_DEGREE + 360) % 360 + 360) % 360;
  const gateIndex = Math.floor(shifted / DEGREES_PER_GATE);
  const withinGate = shifted - gateIndex * DEGREES_PER_GATE;
  const line = Math.floor(withinGate / DEGREES_PER_LINE) + 1;
  return { gate: GATE_WHEEL[gateIndex], line: Math.min(6, Math.max(1, line)) };
}

/** Real-body ecliptic longitudes (0–360) keyed by name, from a natal chart. */
function bodyLongitudes(input: NatalInput): Record<string, number> {
  const chart = computeNatalChart(input);
  const out: Record<string, number> = {};
  for (const p of chart.planets) out[p.key] = p.eclipticDegree;
  return out;
}

/** Derive the 13 HD gate activations (sun/earth/moon/nodes/planets) from a chart. */
function activationsFrom(longitudes: Record<string, number>): GateActivation[] {
  const sun = longitudes.sun ?? 0;
  const northnode = longitudes.northnode ?? 0;
  const derived: Record<string, number> = {
    ...longitudes,
    earth: (sun + 180) % 360,
    southnode: (northnode + 180) % 360,
  };
  return HD_BODY_KEYS.map((key) => degreeToGate(derived[key] ?? 0));
}

function msToNatalInput(ms: number): NatalInput {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    birthDate: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    birthTime: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
    latitude: 0,
    longitude: 0,
    ianaTz: 'Etc/UTC',
  };
}

function sunLongitudeAtUTC(ms: number): number {
  return bodyLongitudes(msToNatalInput(ms)).sun ?? 0;
}

/** Signed angular difference (target - value) normalized to (-180, 180]. */
function signedDiff(value: number, target: number): number {
  return (((target - value + 540) % 360) + 360) % 360 - 180;
}

/** Binary-search the UTC instant where the Sun was `targetLongitude`. */
function findPersonalityInstant(birthUtcMs: number, targetLongitude: number): number {
  let lo = birthUtcMs - 95 * 86400000;
  let hi = birthUtcMs - 80 * 86400000;
  const diffLo = signedDiff(sunLongitudeAtUTC(lo), targetLongitude);
  const diffHi = signedDiff(sunLongitudeAtUTC(hi), targetLongitude);
  // Sun longitude increases monotonically with time (no retrograde) — diffLo
  // should be >0 (target still ahead) and diffHi <0 (target already passed).
  const increasing = diffHi < diffLo;
  while (hi - lo > 60000) {
    const mid = Math.floor((lo + hi) / 2);
    const diffMid = signedDiff(sunLongitudeAtUTC(mid), targetLongitude);
    const targetStillAhead = increasing ? diffMid > 0 : diffMid < 0;
    if (targetStillAhead) lo = mid;
    else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

function unionFind(definedCenters: Set<CenterKey>, completedChannels: { gates: [number, number] }[]) {
  const parent = new Map<CenterKey, CenterKey>();
  for (const c of definedCenters) parent.set(c, c);
  const find = (c: CenterKey): CenterKey => {
    let root = c;
    while (parent.get(root) !== root) root = parent.get(root) as CenterKey;
    return root;
  };
  const union = (a: CenterKey, b: CenterKey) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  for (const { gates } of completedChannels) {
    const ca = GATE_CENTER[gates[0]];
    const cb = GATE_CENTER[gates[1]];
    if (definedCenters.has(ca) && definedCenters.has(cb)) union(ca, cb);
  }
  return find;
}

/**
 * Compute the Human Design bodygraph (Type/Strategy/Authority/Profile/
 * Definition/Centers/Gates). Throws on invalid input — the caller (service)
 * wraps this in try/catch so a bad birth date never breaks the save.
 */
export function computeHumanDesign(input: NatalInput): HumanDesignResult {
  // Personality (conscious) = planetary positions at the birth moment itself.
  const personalityLongitudes = bodyLongitudes(input);
  const personalityGates = activationsFrom(personalityLongitudes);

  const [y, mo, d] = input.birthDate.split('-').map((n) => parseInt(n, 10));
  const [hh, mm] = input.birthTime.split(':').map((n) => parseInt(n, 10));
  const birthChart = computeNatalChart(input);
  const birthUtcMs =
    Date.UTC(y, mo - 1, d, hh, mm) - birthChart.utcOffsetMinutes * 60000;

  // Design (unconscious) = planetary positions ~88 solar degrees before birth.
  const targetSunLongitude = ((personalityLongitudes.sun ?? 0) - 88 + 360) % 360;
  const designInstant = findPersonalityInstant(birthUtcMs, targetSunLongitude);
  const designLongitudes = bodyLongitudes(msToNatalInput(designInstant));
  const designGates = activationsFrom(designLongitudes);

  const activatedGates = new Set<number>([
    ...designGates.map((g) => g.gate),
    ...personalityGates.map((g) => g.gate),
  ]);

  const completedChannels = CHANNELS.filter(
    (c) => activatedGates.has(c.gates[0]) && activatedGates.has(c.gates[1])
  );

  const definedCenters = new Set<CenterKey>();
  for (const c of completedChannels) {
    definedCenters.add(GATE_CENTER[c.gates[0]]);
    definedCenters.add(GATE_CENTER[c.gates[1]]);
  }

  const centers = CENTERS.reduce((acc, c) => {
    acc[c] = definedCenters.has(c);
    return acc;
  }, {} as Record<CenterKey, boolean>);

  const find = unionFind(definedCenters, completedChannels);
  const components = new Set(Array.from(definedCenters).map((c) => find(c)));

  const definitionByCount: Record<number, HDDefinition> = {
    0: 'none',
    1: 'single',
    2: 'split',
    3: 'tripleSplit',
    4: 'quadrupleSplit',
  };
  const definition = definitionByCount[Math.min(4, components.size)] ?? 'quadrupleSplit';

  const throatDefined = centers.throat;
  const throatConnectedToMotor =
    throatDefined &&
    MOTOR_CENTERS.some((m) => centers[m] && find(m) === find('throat'));
  const sacralDefined = centers.sacral;

  let type: HDType;
  if (definedCenters.size === 0) type = 'reflector';
  else if (sacralDefined && throatConnectedToMotor) type = 'manifestingGenerator';
  else if (sacralDefined) type = 'generator';
  else if (throatConnectedToMotor) type = 'manifestor';
  else type = 'projector';

  let authority: HDAuthority;
  if (type === 'reflector') authority = 'lunar';
  else if (centers.solarPlexus) authority = 'emotional';
  else if (centers.sacral) authority = 'sacral';
  else if (centers.spleen) authority = 'splenic';
  else if (centers.heart) authority = 'ego';
  else if (centers.g) authority = 'selfProjected';
  else authority = 'mental';

  const personalitySun = personalityGates[0];
  const designSun = designGates[0];
  const profile = `${personalitySun.line}/${designSun.line}`;

  return {
    type,
    strategy: STRATEGY_PT[type],
    authority,
    profile,
    definition,
    centers,
    gates: { personality: personalityGates, design: designGates },
    definedChannels: completedChannels.map((c) => ({ gates: c.gates, name: c.name })),
  };
}
