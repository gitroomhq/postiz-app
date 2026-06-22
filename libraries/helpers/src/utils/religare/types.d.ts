export interface KinResult {
    kin: number;
    seal: string;
    tone: string;
    sealIndex: number;
    toneIndex: number;
    accent: string;
}
export interface MoonPhase {
    name: string;
    emoji: string;
    desc: string;
    index: number;
}
export type ArchetypeKey = 'innocent' | 'sage' | 'explorer' | 'outlaw' | 'magician' | 'hero' | 'lover' | 'jester' | 'everyman' | 'caregiver' | 'ruler' | 'creator';
export interface ArchetypeOption {
    id: string;
    label: string;
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
export type VocationKey = 'creative' | 'analytical' | 'caregiving' | 'leadership' | 'entrepreneurial' | 'communication' | 'spiritual' | 'technical' | 'artisan' | 'educator';
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
export interface IkigaiAnswers {
    loves: string;
    goodAt: string;
    worldNeeds: string;
    paidFor: string;
}
export interface VocationalCalling {
    key: VocationKey;
    name: string;
    score: number;
}
export interface VocationalResult {
    callings: VocationalCalling[];
    ikigai: IkigaiAnswers;
}
export interface QuestionnaireAnswers {
    archetypes: Record<string, string>;
    vocational: Record<string, string>;
    ikigai: IkigaiAnswers;
}
export interface SynthesisInput {
    name?: string | null;
    kin?: KinResult | null;
    moon?: MoonPhase | null;
    archetypes?: ArchetypeResult | null;
    vocational?: VocationalResult | null;
}
export interface NatalInput {
    birthDate: string;
    birthTime: string;
    latitude: number;
    longitude: number;
    ianaTz: string;
}
export type ZodiacSignKey = 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo' | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';
export interface SignPlacement {
    sign: ZodiacSignKey;
    signPt: string;
    degreeInSign: number;
}
export interface PlanetPosition extends SignPlacement {
    key: string;
    name: string;
    eclipticDegree: number;
    house: number | null;
    retrograde: boolean;
}
export interface HouseCusp {
    house: number;
    eclipticDegree: number;
    sign: ZodiacSignKey;
    signPt: string;
}
export interface AstroAspect {
    a: string;
    b: string;
    type: string;
    orb: number;
}
export interface AstrologyResult {
    bigThree: {
        sun: SignPlacement;
        moon: SignPlacement;
        rising: SignPlacement;
    };
    planets: PlanetPosition[];
    houses: HouseCusp[];
    angles: {
        ascendant: SignPlacement & {
            eclipticDegree: number;
        };
        midheaven: SignPlacement & {
            eclipticDegree: number;
        };
    };
    aspects: AstroAspect[];
    utcOffsetMinutes: number;
    ianaTz: string;
}
export type CenterKey = 'head' | 'ajna' | 'throat' | 'g' | 'heart' | 'spleen' | 'sacral' | 'solarPlexus' | 'root';
export type HDType = 'generator' | 'manifestingGenerator' | 'manifestor' | 'projector' | 'reflector';
export type HDAuthority = 'emotional' | 'sacral' | 'splenic' | 'ego' | 'selfProjected' | 'lunar' | 'mental';
export type HDDefinition = 'none' | 'single' | 'split' | 'tripleSplit' | 'quadrupleSplit';
export interface GateActivation {
    gate: number;
    line: number;
}
export interface HumanDesignResult {
    type: HDType;
    strategy: string;
    authority: HDAuthority;
    profile: string;
    definition: HDDefinition;
    centers: Record<CenterKey, boolean>;
    gates: {
        personality: GateActivation[];
        design: GateActivation[];
    };
    definedChannels: {
        gates: [number, number];
        name: string;
    }[];
}
export type ThemeKey = 'comunicacao' | 'lideranca' | 'criacao' | 'estrategia' | 'servico' | 'introspeccao' | 'conexao' | 'transformacao' | 'ensino' | 'liberdade' | 'estrutura' | 'intuicao';
export type FragmentSection = 'astrology' | 'tzolkin' | 'archetypes' | 'vocational' | 'humanDesign' | 'integrative';
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
export interface ReligareDNA {
    essence: {
        bigThree: AstrologyResult['bigThree'] | null;
        kin: KinResult | null;
        archetypes: {
            primary: ArchetypeKey;
            secondary: ArchetypeKey;
        } | null;
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
export interface DNAInput {
    name?: string | null;
    kin?: KinResult | null;
    moon?: MoonPhase | null;
    astrology?: AstrologyResult | null;
    archetypes?: ArchetypeResult | null;
    vocational?: VocationalResult | null;
    humanDesign?: HumanDesignResult | null;
}
