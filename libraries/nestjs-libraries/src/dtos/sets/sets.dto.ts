import { IsDefined, IsOptional, IsString } from 'class-validator';

export class SetsDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  content: string;
}

export class UpdateSetsDto {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  name: string;

  @IsString()
  @IsDefined()
  content: string;
} 