import { IsString, IsOptional, IsIn, MinLength, MaxLength, IsEmail, IsUrl } from 'class-validator';

export const CLIENT_STATUSES = ['ACTIVE', 'PROSPECT', 'LEAD', 'INACTIVE'] as const;
export type ClientStatus = typeof CLIENT_STATUSES[number];

export const INTERACTION_TYPES = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'WHATSAPP'] as const;
export type InteractionType = typeof INTERACTION_TYPES[number];

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  segment?: string;

  @IsOptional()
  @IsIn(CLIENT_STATUSES)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  segment?: string;

  @IsOptional()
  @IsIn(CLIENT_STATUSES)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  responsibleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class ListClientsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(CLIENT_STATUSES)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  page?: string;
}

export class CreateContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  role?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class CreateInteractionDto {
  @IsIn(INTERACTION_TYPES)
  type: InteractionType;

  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  summary: string;
}
