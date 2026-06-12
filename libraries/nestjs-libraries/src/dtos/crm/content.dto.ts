import { IsString, IsOptional, IsIn, IsArray, IsBoolean, MinLength, MaxLength, IsDateString } from 'class-validator';

export const CONTENT_TYPES = ['POST', 'CAROUSEL', 'VIDEO', 'STORY', 'REEL'] as const;
export const CONTENT_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ADJUSTMENT_REQUESTED', 'PUBLISHED', 'ARCHIVED'] as const;

export class CreateContentItemDto {
  @IsString() @MinLength(1) @MaxLength(255)
  title: string;

  @IsOptional() @IsString() @MaxLength(10000)
  body?: string;

  @IsOptional() @IsArray()
  mediaUrls?: string[];

  @IsOptional() @IsIn(CONTENT_TYPES)
  type?: string;

  @IsOptional() @IsDateString()
  scheduledAt?: string;
}

export class UpdateContentItemDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255)
  title?: string;

  @IsOptional() @IsString() @MaxLength(10000)
  body?: string;

  @IsOptional() @IsArray()
  mediaUrls?: string[];

  @IsOptional() @IsIn(CONTENT_TYPES)
  type?: string;

  @IsOptional() @IsIn(CONTENT_STATUSES)
  status?: string;

  @IsOptional() @IsDateString()
  scheduledAt?: string;
}

export class AddEventDto {
  @IsString() @MinLength(1) @MaxLength(500)
  text: string;

  @IsOptional() @IsBoolean()
  byGuest?: boolean;
}

export class GenerateLinkDto {
}
