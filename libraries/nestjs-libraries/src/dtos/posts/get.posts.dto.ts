import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

export class GetPostsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsDefined()
  @IsIn(['day', 'week', 'month'])
  display: 'day' | 'week' | 'month';

  @IsOptional()
  @IsString()
  customer: string;
}
