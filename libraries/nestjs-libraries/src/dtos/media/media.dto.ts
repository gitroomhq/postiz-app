import { IsDefined, IsOptional, IsString, IsUrl, ValidateIf, Validate } from 'class-validator';
import { Transform } from 'class-transformer';
import { ValidUrlExtension, ValidUrlPath } from '@gitroom/helpers/utils/valid.url.path';

export class MediaDto {
  @IsOptional()
  @IsString()
  id?: string;

  @Transform(({ value, obj }) => value ?? obj?.url)
  @IsString()
  @IsDefined()
  @Validate(ValidUrlPath)
  @Validate(ValidUrlExtension)
  path: string;

  @ValidateIf((o) => o.alt)
  @IsString()
  alt?: string;

  @ValidateIf((o) => o.thumbnail)
  @IsUrl()
  thumbnail?: string;
}
