import { ArchetypeInfo, ArchetypeKey, ArchetypeQuestion, ArchetypeResult } from './types';
export declare const ARCHETYPE_INFO: Record<ArchetypeKey, ArchetypeInfo>;
export declare const ARCHETYPE_QUESTIONS: ArchetypeQuestion[];
export declare function scoreArchetypes(answers: Record<string, string>): ArchetypeResult;
