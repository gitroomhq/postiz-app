import { IsOptional, IsString, MinLength } from 'class-validator';

export class ListmonkDto {
  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  preview: string;

  @IsString()
  list: string;

  @IsString()
  @IsOptional()
  template: string;
}
