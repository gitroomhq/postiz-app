import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsNumber,
  Max,
  Min,
} from 'class-validator';
import dayjs from 'dayjs';

export class GetPostsDto {
  @Type(() => Number)
  @IsNumber()
  @Max(52)
  @Min(1)
  week: number;

  @Type(() => Number)
  @IsNumber()
  @Max(6)
  @Min(0)
  day: number;

  @IsDefined()
  @IsIn(['day', 'week', 'month'])
  display: 'day' | 'week' | 'month';

  @Type(() => Number)
  @IsNumber()
  @Max(52)
  @Min(1)
  month: number;

  @Type(() => Number)
  @IsNumber()
  @Max(dayjs().add(10, 'year').year())
  @Min(2022)
  year: number;
}
