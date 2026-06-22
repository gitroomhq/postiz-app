import { AstrologyResult, SignPlacement, ZodiacSignKey } from './types';
export declare const SIGN_KEYS: ZodiacSignKey[];
export declare const SIGN_PT: Record<ZodiacSignKey, string>;
export declare function signFromDegree(eclipticDegree: number): SignPlacement;
export declare function toAstroChartData(result: AstrologyResult): {
    planets: Record<string, number[]>;
    cusps: number[];
};
