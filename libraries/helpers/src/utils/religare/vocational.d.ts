import { IkigaiAnswers, VocationInfo, VocationKey, VocationalQuestion, VocationalResult } from './types';
export declare const VOCATION_INFO: Record<VocationKey, VocationInfo>;
export declare const VOCATIONAL_QUESTIONS: VocationalQuestion[];
export declare function scoreVocational(answers: Record<string, string>, ikigai?: IkigaiAnswers): VocationalResult;
