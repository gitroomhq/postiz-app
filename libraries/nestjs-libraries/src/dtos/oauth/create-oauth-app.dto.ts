import { IsDefined, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateOAuthAppDto {
  @IsString()
  @IsDefined()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  pictureId?: string;

  @IsString()
  @IsDefined()
  @IsUrl({ require_tld: false })
  redirectUrl: string;
}
