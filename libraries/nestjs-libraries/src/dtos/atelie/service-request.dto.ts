import { IsString, IsOptional, IsIn, IsObject, MinLength, MaxLength } from 'class-validator';

export const SERVICE_SCOPE_LEVELS = ['SIMPLES', 'PADRAO', 'ROBUSTO'] as const;
export const SERVICE_REQUEST_STATUSES = [
  'SOLICITADO',
  'CONFIRMADO',
  'EM_PRODUCAO',
  'EM_REVISAO',
  'ENTREGUE',
  'APROVADO',
  'ARQUIVADO',
] as const;

export class CreateServiceRequestDto {
  @IsString() @MinLength(1) @MaxLength(100)
  offeringSlug: string;

  @IsObject()
  briefing: Record<string, any>;

  @IsOptional() @IsIn(SERVICE_SCOPE_LEVELS)
  scopeLevel?: string;

  @IsOptional() @IsString() @MaxLength(200)
  priceRange?: string;

  @IsOptional() @IsString() @MaxLength(200)
  leadTimeRange?: string;
}

export class UpdateServiceRequestStatusDto {
  @IsIn(SERVICE_REQUEST_STATUSES)
  status: string;
}

export class AddServiceRequestEventDto {
  @IsString() @MinLength(1) @MaxLength(120)
  type: string;

  @IsOptional() @IsString() @MaxLength(2000)
  text?: string;
}
