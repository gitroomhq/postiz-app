import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}
