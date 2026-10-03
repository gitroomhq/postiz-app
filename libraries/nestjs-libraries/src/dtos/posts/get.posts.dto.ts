import {
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class GetPostsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  customer: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value
  )
  includeAttachments?: boolean;
}
