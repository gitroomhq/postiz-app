import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

// Enough for a few pages of the media library picked one by one; the whole
// library goes through `all` instead of a list of ids.
export const BULK_MEDIA_MAX = 100;

export interface BulkDeleteMediaResult {
  deleted: number;
  filesRemoved: number;
  filesFailed: number;
}

export class BulkDeleteMediaDto {
  @ValidateIf((body: BulkDeleteMediaDto) => !body.all)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_MEDIA_MAX)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids?: string[];

  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsBoolean()
  removeFiles: boolean;
}
