import {
  IsDefined,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class PinterestSettingsDto {
  @IsString()
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  link: string;

  @IsString()
  @IsOptional()
  dominant_color: string;

  @IsDefined({
    message: 'Board is required',
  })
  @IsString({
    message: 'Board is required',
  })
  @MinLength(1, {
    message: 'Board is required',
  })
  board: string;
}
