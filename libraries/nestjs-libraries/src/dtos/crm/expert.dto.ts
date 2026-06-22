import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * Expert — pessoa/voz dos carrosséis (N:N com marca/Client). Guarda a voz/DNA;
 * o visual (cores/handle/logo) fica na marca.
 */
export class CreateExpertDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  toneOfVoice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  keywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  dna?: string;
}

export class UpdateExpertDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  handle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  toneOfVoice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  keywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  dna?: string;
}

export class ListExpertsDto {
  @IsOptional()
  @IsString()
  search?: string;
}
