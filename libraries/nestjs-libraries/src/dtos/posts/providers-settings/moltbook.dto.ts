import { IsOptional, IsString } from 'class-validator';

export class MoltbookDto {
  @IsOptional()
  @IsString()
  submolt?: string;
}
