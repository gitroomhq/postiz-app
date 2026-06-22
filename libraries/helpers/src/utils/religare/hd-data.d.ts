import { CenterKey } from './types';
export declare const GATE_WHEEL: number[];
export declare const GATE_WHEEL_START_DEGREE = 358.25;
export declare const DEGREES_PER_GATE = 5.625;
export declare const DEGREES_PER_LINE: number;
export declare const CENTERS: CenterKey[];
export declare const CENTER_LABELS_PT: Record<CenterKey, string>;
export declare const MOTOR_CENTERS: CenterKey[];
export declare const GATE_CENTER: Record<number, CenterKey>;
export declare const CHANNELS: {
    gates: [number, number];
    name: string;
}[];
