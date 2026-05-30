import { IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetNotificationsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 0;
}
