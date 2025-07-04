import { IsDefined, IsString, IsUrl, ValidateIf } from 'class-validator';

export class MediaDto {
  @IsString()
  @IsDefined()
  id: string;

  @IsString()
  @IsDefined()
  path: string;

  @ValidateIf((o) => o.alt)
  @IsString()
  alt?: string;

  @ValidateIf((o) => o.thumbnail)
  @IsUrl()
  thumbnail?: string;
}
