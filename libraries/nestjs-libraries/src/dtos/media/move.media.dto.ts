import { IsOptional, IsString } from 'class-validator';

export class MoveMediaDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsString()
  folderId?: string;
}
