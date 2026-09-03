import { IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUrl, Max, Min, ValidateIf } from 'class-validator';

export class SaveMediaInformationDto {
  @IsString()
  id: string;

  @IsOptional() @IsString()
  alt?: string;

  @IsUrl()
  @ValidateIf((o) => !!o.thumbnail)
  thumbnail?: string;

  @IsNumber()
  @ValidateIf((o) => !!o.thumbnailTimestamp)
  thumbnailTimestamp?: number;

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) tagIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) people?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) products?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) keywords?: string[];
  @IsOptional() @IsIn(['draft', 'ready', 'archived']) status?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) focusX?: number | null;
  @IsOptional() @IsNumber() @Min(0) @Max(1) focusY?: number | null;
  @IsOptional() @IsArray() @IsString({ each: true }) recommendedPlatforms?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsUrl() sourceUrl?: string;
  @IsOptional() @IsString() attribution?: string;
  @IsOptional() @IsString() copyrightOwner?: string;
  @IsOptional() @IsIn(['unknown', 'owned', 'licensed', 'creative_commons', 'third_party', 'public_domain']) licenseType?: string;
  @IsOptional() @IsUrl() licenseUrl?: string;
  @IsOptional() @IsDateString() expiresAt?: string | null;
}
