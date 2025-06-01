import { IsNumber, Max, Min } from 'class-validator';

export class AudienceDto {
  @IsNumber()
  @Max(99999999)
  @Min(1)
  audience: number;
}
