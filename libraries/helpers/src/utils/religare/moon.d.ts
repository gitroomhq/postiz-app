import { MoonPhase } from './types';
export declare const MOON_PHASES: Omit<MoonPhase, 'index'>[];
export declare function getMoonPhase(date?: Date): MoonPhase;
