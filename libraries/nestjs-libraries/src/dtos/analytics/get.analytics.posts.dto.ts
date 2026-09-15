import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { toOptionalInt } from './optional-int';

export class GetAnalyticsPostsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  @Transform(({ value }) => toOptionalInt(value))
  date?: number = 30;

  @IsOptional()
  @IsString()
  integrationIds?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value
  )
  platform?: string;

  @IsOptional()
  @IsIn(['reactions', 'comments', 'impressions', 'engagement', 'published'])
  sort?: 'reactions' | 'comments' | 'impressions' | 'engagement' | 'published' =
    'reactions';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  dir?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => toOptionalInt(value))
  page?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => toOptionalInt(value))
  limit?: number = 20;
}
