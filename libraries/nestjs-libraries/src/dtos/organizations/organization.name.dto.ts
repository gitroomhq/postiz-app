import { IsDefined, IsString, MaxLength, MinLength } from 'class-validator';

export class OrganizationNameDto {
  @IsString()
  @IsDefined()
  @MinLength(3)
  @MaxLength(128)
  name: string;
}
