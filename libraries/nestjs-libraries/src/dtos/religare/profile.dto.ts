import {
  IsString,
  IsOptional,
  IsIn,
  IsNumber,
  IsObject,
  MinLength,
  MaxLength,
} from 'class-validator';

export const RELIGARE_CONTEXTS = ['agency', 'therapy'] as const;
export type ReligareContext = (typeof RELIGARE_CONTEXTS)[number];

/**
 * Religare profile — a leitura de essência de um expert. Data, hora e local de
 * nascimento são obrigatórios (base para Tzolkin e, nas fatias seguintes,
 * Astrologia e Human Design).
 */
export class CreateReligareProfileDto {
  @IsOptional()
  @IsString()
  expertId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  birthDate: string; // ISO date (YYYY-MM-DD)

  @IsString()
  @MaxLength(5)
  birthTime: string; // HH:mm

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  birthPlace: string;

  @IsOptional()
  @IsNumber()
  birthLat?: number;

  @IsOptional()
  @IsNumber()
  birthLng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  birthTz?: string;
}

export class UpdateReligareProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  birthTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  birthPlace?: string;

  @IsOptional()
  @IsNumber()
  birthLat?: number;

  @IsOptional()
  @IsNumber()
  birthLng?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  birthTz?: string;

  @IsOptional()
  @IsObject()
  brandProfile?: Record<string, unknown>;
}

export class ListReligareProfilesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;
}

/** Respostas dos questionários (arquétipos + vocacional + ikigai). */
export class SubmitQuestionnaireDto {
  @IsObject()
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

export class SetContextDto {
  @IsIn(RELIGARE_CONTEXTS)
  context: ReligareContext;
}
