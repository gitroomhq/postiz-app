import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsString, Max, Min } from 'class-validator';
import dayjs from 'dayjs';

export class GetPostsDto {
  @Type(() => Number)
  @IsNumber()
  @Max(52)
  @Min(1)
  week: number;

  @Type(() => Number)
  @IsNumber()
  @Max(dayjs().add(10, 'year').year())
  @Min(2022)
  year: number;
}
