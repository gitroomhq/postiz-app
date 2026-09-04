import { IsString } from 'class-validator';

export class RenameMediaFolderDto {
  @IsString()
  name: string;
}
