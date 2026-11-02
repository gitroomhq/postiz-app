import { IsOptional, IsTimeZone } from 'class-validator';

export class TimezoneDto {
  // empty means the browser's timezone
  @IsOptional()
  @IsTimeZone()
  timezoneName?: string;
}
