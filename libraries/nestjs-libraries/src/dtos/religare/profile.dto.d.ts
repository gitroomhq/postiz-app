export declare const RELIGARE_CONTEXTS: readonly ["agency", "therapy"];
export type ReligareContext = (typeof RELIGARE_CONTEXTS)[number];
export declare class CreateReligareProfileDto {
    expertId?: string;
    name: string;
    birthDate: string;
    birthTime: string;
    birthPlace: string;
    birthLat?: number;
    birthLng?: number;
    birthTz?: string;
}
export declare class UpdateReligareProfileDto {
    name?: string;
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    birthLat?: number;
    birthLng?: number;
    birthTz?: string;
    brandProfile?: Record<string, unknown>;
}
export declare class ListReligareProfilesDto {
    search?: string;
    page?: string;
}
export declare class SubmitQuestionnaireDto {
    answers: {
        archetypes: Record<string, string>;
        vocational: Record<string, string>;
        ikigai: {
            loves: string;
            goodAt: string;
            worldNeeds: string;
            paidFor: string;
        };
    };
}
export declare class SetContextDto {
    context: ReligareContext;
}
