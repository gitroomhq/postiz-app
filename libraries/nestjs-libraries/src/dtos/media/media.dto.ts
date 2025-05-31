import { IsDefined, IsString } from 'class-validator';

export class MediaDto {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  path: string;
}
