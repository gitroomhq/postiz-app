import { ReligareDNA } from '../types';
export interface ExportProfileMeta {
    name?: string | null;
    birthDate?: string | null;
    birthPlace?: string | null;
}
export declare function dnaToMarkdown(profile: ExportProfileMeta, dna: ReligareDNA): string;
export interface DnaExportJson {
    meta: {
        name: string | null;
        birthDate: string | null;
        birthPlace: string | null;
        generatedAt: string;
    };
    dna: ReligareDNA;
}
export declare function dnaToBriefingSection(dna: ReligareDNA): string;
export declare function dnaToExportJson(profile: ExportProfileMeta, dna: ReligareDNA): DnaExportJson;
