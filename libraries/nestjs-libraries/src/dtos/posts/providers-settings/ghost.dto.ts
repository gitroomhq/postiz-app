import {
  IsArray,
  IsDefined,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';
import { Type } from 'class-transformer';

export enum GhostPostStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
}

export class GhostDto {
  @IsString()
  @MinLength(1)
  @IsDefined()
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsEnum(GhostPostStatus)
  @IsDefined()
  status: GhostPostStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  feature_image?: MediaDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
