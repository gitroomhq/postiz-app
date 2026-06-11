import { IsString, IsOptional, IsIn, IsObject, MinLength, MaxLength, IsUrl } from 'class-validator';

export const PROJECT_STATUSES = ['ACTIVE', 'PAUSED', 'ARCHIVED'] as const;
export type ProjectStatusValue = typeof PROJECT_STATUSES[number];

export const TONE_OF_VOICE_OPTIONS = ['FORMAL', 'CASUAL', 'INSPIRATIONAL', 'TECHNICAL', 'PLAYFUL', 'AUTHORITATIVE'] as const;

export class CreateProjectDto {
  @IsString() @MinLength(2) @MaxLength(120)
  name: string;

  @IsString()
  clientId: string;

  @IsString()
  ownerId: string;

  @IsOptional() @IsString() @MaxLength(100)
  businessArea?: string;

  @IsOptional() @IsString() @MaxLength(200)
  slogan?: string;

  @IsOptional() @IsString() @MaxLength(500)
  website?: string;

  @IsOptional() @IsString() @MaxLength(500)
  bioLink?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  productsServices?: string;

  @IsOptional() @IsIn(TONE_OF_VOICE_OPTIONS)
  toneOfVoice?: string;

  @IsOptional() @IsString() @MaxLength(200)
  cta1?: string;

  @IsOptional() @IsString() @MaxLength(200)
  cta2?: string;

  @IsOptional() @IsString() @MaxLength(200)
  cta3?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  briefing?: string;

  @IsOptional() @IsString()
  locale?: string;

  @IsOptional() @IsString()
  timezone?: string;

  @IsOptional() @IsIn(PROJECT_STATUSES)
  status?: ProjectStatusValue;

  @IsOptional() @IsObject()
  socialHandles?: Record<string, string>;

  @IsOptional() @IsObject()
  persona?: { name?: string; pains?: string[]; desires?: string[] };
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MaxLength(100)
  businessArea?: string;

  @IsOptional() @IsString() @MaxLength(200)
  slogan?: string;

  @IsOptional() @IsString() @MaxLength(500)
  website?: string;

  @IsOptional() @IsString() @MaxLength(500)
  bioLink?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  productsServices?: string;

  @IsOptional() @IsIn(TONE_OF_VOICE_OPTIONS)
  toneOfVoice?: string;

  @IsOptional() @IsString() @MaxLength(200)
  cta1?: string;

  @IsOptional() @IsString() @MaxLength(200)
  cta2?: string;

  @IsOptional() @IsString() @MaxLength(200)
  cta3?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  briefing?: string;

  @IsOptional() @IsString()
  locale?: string;

  @IsOptional() @IsString()
  timezone?: string;

  @IsOptional() @IsIn(PROJECT_STATUSES)
  status?: ProjectStatusValue;

  @IsOptional() @IsObject()
  socialHandles?: Record<string, string>;

  @IsOptional() @IsObject()
  persona?: { name?: string; pains?: string[]; desires?: string[] };
}

export class ListProjectsDto {
  @IsOptional() @IsString()
  clientId?: string;

  @IsOptional() @IsIn(PROJECT_STATUSES)
  status?: ProjectStatusValue;

  @IsOptional() @IsString()
  page?: string;
}
