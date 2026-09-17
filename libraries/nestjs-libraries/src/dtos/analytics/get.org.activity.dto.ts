import { IsDateString, IsOptional } from 'class-validator';

export class GetOrgActivityDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
