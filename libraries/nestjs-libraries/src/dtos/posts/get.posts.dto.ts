import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsString, Max, Min, ValidateIf } from 'class-validator';
import dayjs from 'dayjs';

export class GetPostsDto {
  @ValidateIf((o) => !o.month)
  @Type(() => Number)
  @IsNumber()
  @Max(52)
  @Min(1)
  week: number;

  @ValidateIf((o) => !o.week)
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
