import {
  IsArray,
  IsDefined,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { MediaDto } from '@gitroom/nestjs-libraries/dtos/media/media.dto';
import { Type } from 'class-transformer';

export class WordpressTagDto {
  @IsNumber()
  value: number;

  @IsString()
  label: string;
}

export class WordpressCategoryDto {
  @IsNumber()
  value: number;

  @IsString()
  label: string;
}

export class WordpressDto {
  @IsString()
  @MinLength(2)
  @IsDefined()
  title: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  main_image?: MediaDto;

  @IsString()
  @IsDefined()
  type: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsNumber()
  author?: number;

  @IsOptional()
  @IsArray()
  @Type(() => WordpressCategoryDto)
  @ValidateNested({ each: true })
  categories?: WordpressCategoryDto[];

  @IsOptional()
  @IsArray()
  @Type(() => WordpressTagDto)
  @ValidateNested({ each: true })
  tags?: WordpressTagDto[];

  @IsOptional()
  @IsString()
  @IsIn(['publish', 'draft', 'pending', 'private', 'future'])
  status?: string;
}
