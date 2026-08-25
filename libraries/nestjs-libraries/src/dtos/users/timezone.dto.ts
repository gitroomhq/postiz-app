import { IsString, ValidateIf } from 'class-validator';

export class TimezoneDto {
  @ValidateIf((o) => o.timezoneName !== null)
  @IsString()
  timezoneName: string | null;
}
