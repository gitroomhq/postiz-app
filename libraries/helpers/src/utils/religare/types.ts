// Religare — shared calculation types (pure, no React, no server deps).
// Used by both the backend (compute-on-save) and the frontend (render/preview).

export interface KinResult {
  kin: number; // 1..260
  seal: string;
  tone: string;
  sealIndex: number; // 0..19
  toneIndex: number; // 0..12
  accent: string; // hex color for the seal
}

export interface MoonPhase {
  name: string;
  emoji: string;
  desc: string;
  index: number; // 0..7
}

// ── Archetypes (Jung) ──────────────────────────────────────────────────────

export type ArchetypeKey =
  | 'innocent'
  | 'sage'
  | 'explorer'
  | 'outlaw'
  | 'magician'
  | 'hero'
  | 'lover'
  | 'jester'
  | 'everyman'
  | 'caregiver'
  | 'ruler'
  | 'creator';

export interface ArchetypeOption {
  /** Stable id of the option within the question. */
  id: string;
  label: string;
  /** Weight added to each archetype when this option is chosen. */
  weights: Partial<Record<ArchetypeKey, number>>;
}

export interface ArchetypeQuestion {
  id: string;
  prompt: string;
  options: ArchetypeOption[];
}

export interface ArchetypeInfo {
  key: ArchetypeKey;
  name: string;
  tagline: string;
  description: string;
}

export interface ArchetypeResult {
  primary: ArchetypeKey;
  secondary: ArchetypeKey;
  scores: Record<ArchetypeKey, number>;
}

// ── Vocational test (callings + Ikigai) ────────────────────────────────────

export type VocationKey =
  | 'creative'
  | 'analytical'
  | 'caregiving'
  | 'leadership'
  | 'entrepreneurial'
  | 'communication'
  | 'spiritual'
  | 'technical'
  | 'artisan'
  | 'educator';

export interface VocationalOption {
  id: string;
  label: string;
  weights: Partial<Record<VocationKey, number>>;
}

export interface VocationalQuestion {
  id: string;
  prompt: string;
  options: VocationalOption[];
}

export interface VocationInfo {
  key: VocationKey;
  name: string;
  description: string;
}

/** The four Ikigai pillars — free-text reflection answers. */
export interface IkigaiAnswers {
  loves: string; // o que você ama
  goodAt: string; // no que você é bom
  worldNeeds: string; // o que o mundo precisa
  paidFor: string; // pelo que pode ser pago
}

export interface VocationalCalling {
  key: VocationKey;
  name: string;
  score: number;
}

export interface VocationalResult {
  callings: VocationalCalling[]; // ranked desc
  ikigai: IkigaiAnswers;
}

/** Raw answers payload submitted from the onboarding questionnaire. */
export interface QuestionnaireAnswers {
  /** questionId -> selected optionId */
  archetypes: Record<string, string>;
  /** questionId -> selected optionId */
  vocational: Record<string, string>;
  ikigai: IkigaiAnswers;
}

/** Minimal profile shape needed to build the deterministic synthesis. */
export interface SynthesisInput {
  name?: string | null;
  kin?: KinResult | null;
  moon?: MoonPhase | null;
  archetypes?: ArchetypeResult | null;
  vocational?: VocationalResult | null;
}

// ── Astrology (natal chart) ────────────────────────────────────────────────

/** Birth moment + location needed to compute a natal chart. */
export interface NatalInput {
  /** ISO date YYYY-MM-DD (clock date at birth place). */
  birthDate: string;
  /** Clock time HH:mm at birth place. */
  birthTime: string;
  latitude: number;
  longitude: number;
  /** IANA timezone of the birth place, e.g. "America/Sao_Paulo". */
  ianaTz: string;
}

/** One of the 12 tropical zodiac signs (PT label resolved separately). */
export type ZodiacSignKey =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export interface SignPlacement {
  sign: ZodiacSignKey;
  signPt: string;
  /** Degree within the sign (0–30). */
  degreeInSign: number;
}

export interface PlanetPosition extends SignPlacement {
  /** Stable key, e.g. "sun", "moon", "mercury". */
  key: string;
  /** PT display name, e.g. "Sol". */
  name: string;
  /** Ecliptic longitude 0–360 (for the SVG wheel). */
  eclipticDegree: number;
  /** House number 1–12 (null if not resolvable). */
  house: number | null;
  retrograde: boolean;
}

export interface HouseCusp {
  /** House number 1–12. */
  house: number;
  eclipticDegree: number;
  sign: ZodiacSignKey;
  signPt: string;
}

export interface AstroAspect {
  a: string; // body key
  b: string; // body key
  type: string; // conjunction, opposition, trine, square, sextile, ...
  orb: number;
}

export interface AstrologyResult {
  bigThree: {
    sun: SignPlacement;
    moon: SignPlacement;
    rising: SignPlacement; // ascendant
  };
  planets: PlanetPosition[];
  houses: HouseCusp[];
  angles: {
    ascendant: SignPlacement & { eclipticDegree: number };
    midheaven: SignPlacement & { eclipticDegree: number };
  };
  aspects: AstroAspect[];
  /** Resolved historical UTC offset in minutes (e.g. -120 for BR summer time). */
  utcOffsetMinutes: number;
  ianaTz: string;
}

// ── Human Design (bodygraph) ────────────────────────────────────────────────

export type CenterKey =
  | 'head'
  | 'ajna'
  | 'throat'
  | 'g'
  | 'heart'
  | 'spleen'
  | 'sacral'
  | 'solarPlexus'
  | 'root';

export type HDType =
  | 'generator'
  | 'manifestingGenerator'
  | 'manifestor'
  | 'projector'
  | 'reflector';

export type HDAuthority =
  | 'emotional'
  | 'sacral'
  | 'splenic'
  | 'ego'
  | 'selfProjected'
  | 'lunar'
  | 'mental';

export type HDDefinition =
  | 'none'
  | 'single'
  | 'split'
  | 'tripleSplit'
  | 'quadrupleSplit';

export interface GateActivation {
  gate: number;
  line: number;
}

export interface HumanDesignResult {
  type: HDType;
  strategy: string;
  authority: HDAuthority;
  /** "${personalityLine}/${designLine}", e.g. "4/6". */
  profile: string;
  definition: HDDefinition;
  centers: Record<CenterKey, boolean>;
  gates: {
    personality: GateActivation[];
    design: GateActivation[];
  };
  definedChannels: { gates: [number, number]; name: string }[];
}

// ── Interpretive engine (fragments + DNA) ──────────────────────────────────

/**
 * Canonical theme vocabulary shared by every fragment across all tools.
 * The convergence of these tags across tools drives the integrative synthesis.
 */
export type ThemeKey =
  | 'comunicacao'
  | 'lideranca'
  | 'criacao'
  | 'estrategia'
  | 'servico'
  | 'introspeccao'
  | 'conexao'
  | 'transformacao'
  | 'ensino'
  | 'liberdade'
  | 'estrutura'
  | 'intuicao';

export type FragmentSection =
  | 'astrology'
  | 'tzolkin'
  | 'archetypes'
  | 'vocational'
  | 'humanDesign'
  | 'integrative';

/** A curated PT text snippet, tagged with the themes it expresses. */
export interface Fragment {
  id: string;
  section: FragmentSection;
  text: string;
  tags: Partial<Record<ThemeKey, number>>;
}

export interface RankedTheme {
  key: ThemeKey;
  label: string;
  weight: number;
}

/** The canonical "DNA Religare" — single source for PDF/export/Volatis feed. */
export interface ReligareDNA {
  essence: {
    bigThree: AstrologyResult['bigThree'] | null;
    kin: KinResult | null;
    archetypes: { primary: ArchetypeKey; secondary: ArchetypeKey } | null;
    callings: VocationalCalling[];
  };
  themes: RankedTheme[];
  toneOfVoice: string;
  narrative: {
    astrology: string;
    tzolkin: string;
    archetypes: string;
    vocational: string;
    humanDesign: string;
    integrative: string;
  };
}

/** Input to assemble the DNA (all already-computed pieces). */
export interface DNAInput {
  name?: string | null;
  kin?: KinResult | null;
  moon?: MoonPhase | null;
  astrology?: AstrologyResult | null;
  archetypes?: ArchetypeResult | null;
  vocational?: VocationalResult | null;
  humanDesign?: HumanDesignResult | null;
}
