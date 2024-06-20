import { IsDefined, IsOptional, IsString, IsUrl } from 'class-validator';

export class DribbbleDto {
  @IsString()
  @IsDefined()
  title: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  team: string;
}
