import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

// postmonster: Publications page filters (PRD 7.1) - all statuses of the
// unified model, see libraries/helpers/src/postmonster/post-status.ts
export type PublicationStatusFilter =
  | 'all'
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'needs_check';

export class GetPublicationsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsOptional()
  @IsString()
  integrationId?: string;

  @IsOptional()
  @IsIn([
    'all',
    'draft',
    'scheduled',
    'publishing',
    'published',
    'failed',
    'needs_check',
  ])
  status?: PublicationStatusFilter = 'all';

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}
