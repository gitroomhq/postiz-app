import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';
import { Type } from 'class-transformer';

export enum GhostPostStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
}

export enum GhostVisibility {
  PUBLIC = 'public',
  MEMBERS = 'members',
  PAID = 'paid',
}

export class GhostDto {
  @IsString()
  @MinLength(1)
  @IsDefined()
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  custom_excerpt?: string;

  @IsEnum(GhostPostStatus)
  @IsOptional()
  status?: GhostPostStatus = GhostPostStatus.PUBLISHED;

  @IsEnum(GhostVisibility)
  @IsOptional()
  visibility?: GhostVisibility = GhostVisibility.PUBLIC;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  feature_image?: MediaDto;

  @IsOptional()
  @IsString()
  feature_image_caption?: string;

  @IsOptional()
  @IsString()
  feature_image_alt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsString()
  canonical_url?: string;

  @IsOptional()
  @IsString()
  meta_title?: string;

  @IsOptional()
  @IsString()
  meta_description?: string;

  @IsOptional()
  @IsString()
  og_image?: string;

  @IsOptional()
  @IsString()
  og_title?: string;

  @IsOptional()
  @IsString()
  og_description?: string;

  @IsOptional()
  @IsString()
  twitter_image?: string;

  @IsOptional()
  @IsString()
  twitter_title?: string;

  @IsOptional()
  @IsString()
  twitter_description?: string;

  @IsOptional()
  @IsDateString()
  published_at?: string;

  @IsOptional()
  @IsString()
  email_subject?: string;

  // Newsletter settings
  @IsOptional()
  @IsString()
  newsletter_id?: string;

  // Visibility tiers for paid content (array of tier IDs)
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tiers?: string[];

  // Publish to email newsletter
  @IsOptional()
  @IsBoolean()
  email_only?: boolean;
}
