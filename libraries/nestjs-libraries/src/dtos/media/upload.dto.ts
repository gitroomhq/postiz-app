import { IsDefined, IsString, IsUrl, Validate } from 'class-validator';
import { ValidUrlExtension } from '@gitroom/helpers/utils/valid.url.path';

export class UploadDto {
  @IsString()
  @IsDefined()
  @IsUrl({ require_protocol: true })
  @Validate(ValidUrlExtension)
  url: string;
}
