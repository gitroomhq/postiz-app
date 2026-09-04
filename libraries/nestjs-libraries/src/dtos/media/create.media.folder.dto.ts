import { IsOptional, IsString } from 'class-validator';

export class CreateMediaFolderDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
