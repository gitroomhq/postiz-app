import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateOAuthAppDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsOptional()
  pictureId?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  redirectUrl?: string;
}
