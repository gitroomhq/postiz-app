import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Same as the maximum page size of the posts list, so a whole page can be
// selected and sent in one request.
export const BULK_POSTS_MAX = 100;

export interface BulkPostsResult {
  succeeded: string[];
  failed: { id: string; reason: string }[];
}

export class BulkPostIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_POSTS_MAX)
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];
}

export class BulkChangePostsStatusDto extends BulkPostIdsDto {
  @IsIn(['draft', 'schedule'])
  status: 'draft' | 'schedule';
}

export class BulkPostDateDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsDateString()
  date: string;
}

export class BulkChangePostsDateDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(BULK_POSTS_MAX)
  @ArrayUnique((post: BulkPostDateDto) => post.id)
  @ValidateNested({ each: true })
  @Type(() => BulkPostDateDto)
  posts: BulkPostDateDto[];
}
