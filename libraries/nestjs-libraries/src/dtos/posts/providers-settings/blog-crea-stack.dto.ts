import {
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class BlogCreaStackDto {
  @IsString()
  @MinLength(2)
  @IsDefined()
  title: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  featuredImage?: string;

  @IsString()
  @IsOptional()
  categorySlug?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  translationGroupId?: string;
}
