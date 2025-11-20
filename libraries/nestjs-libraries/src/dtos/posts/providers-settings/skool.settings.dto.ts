import { IsDefined, IsOptional, IsString, MinLength } from 'class-validator';

export class SkoolSettingsDto {
  @IsString()
  @MinLength(2)
  @IsDefined()
  title: string;

  @IsString()
  @IsOptional()
  labelId?: string;
}

